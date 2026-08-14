"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { getSessionUserFresh, verifyPassword, hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { createNotification } from "@/lib/notifier";
import { LEAD_STATUSES } from "@/lib/constants";

const statusSchema = z.object({
  leadId: z.coerce.number(),
  status: z.enum(LEAD_STATUSES),
});

export async function updateLeadStatusAction(prevState: unknown, formData: FormData) {
  const user = await getSessionUserFresh();
  if (!user || user.role !== "agent") return { error: "Not authorized." };
  const parsed = statusSchema.safeParse({
    leadId: formData.get("leadId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: "Invalid request." };

  const db = getDb();
  const lead = await db.prepare("SELECT * FROM leads WHERE id = ? AND assigned_agent_id = ?").get(parsed.data.leadId, user.id) as
    | { id: number; status: string; first_name: string; last_name: string; response_due_at: string | null; first_response_at: string | null }
    | undefined;
  if (!lead) return { error: "Lead not found or not assigned to you." };

  const now = new Date().toISOString();
  const wasNew = lead.status === "new";

  await db.prepare("UPDATE leads SET status = ?, updated_at = ? WHERE id = ?").run(parsed.data.status, now, lead.id);

  if (wasNew && (parsed.data.status === "contacted" || parsed.data.status === "engaged")) {
    await db.prepare("UPDATE leads SET first_response_at = ? WHERE id = ?").run(now, lead.id);
    const assignment = await db
      .prepare("SELECT assigned_at FROM lead_assignments WHERE lead_id = ? ORDER BY id DESC LIMIT 1")
      .get(lead.id) as { assigned_at: string } | undefined;
    if (assignment) {
      const hours = (Date.now() - new Date(assignment.assigned_at).getTime()) / 3600000;
      const row = await db.prepare("SELECT avg_response_hours FROM agent_profiles WHERE user_id = ?").get(user.id) as { avg_response_hours: number | null };
      const prev = row.avg_response_hours;
      const next = prev == null ? hours : prev * 0.7 + hours * 0.3;
      await db.prepare("UPDATE agent_profiles SET avg_response_hours = ?, updated_at = ? WHERE user_id = ?").run(Math.round(next * 100) / 100, now, user.id);
    }
  }

  if (parsed.data.status === "under_contract" || parsed.data.status === "closed") {
    const admins = await db.prepare("SELECT id FROM users WHERE role IN ('admin','super_admin')").all() as { id: number }[];
    for (const a of admins) {
      await createNotification(a.id, "lead_update", `Lead marked ${parsed.data.status}`, `${lead.first_name} ${lead.last_name} was marked ${parsed.data.status} by ${user.profile?.first_name ?? user.email}.`);
    }
  }

  await audit(user.id, user.role, "lead_status_changed", "lead", lead.id, { from: lead.status, to: parsed.data.status });
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard");
  return { ok: true };
}

const appointmentSchema = z.object({
  leadId: z.coerce.number(),
  scheduledAt: z.string().min(1),
  type: z.string().min(1),
  notes: z.string().optional().default(""),
});

export async function addAppointmentAction(prevState: unknown, formData: FormData) {
  const user = await getSessionUserFresh();
  if (!user || user.role !== "agent") return { error: "Not authorized." };
  const parsed = appointmentSchema.safeParse({
    leadId: formData.get("leadId"),
    scheduledAt: formData.get("scheduledAt"),
    type: formData.get("type"),
    // FormData.get() yields null for an absent field, and z.default() only fills
    // undefined — normalise so an omitted note doesn't fail validation.
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) return { error: "Please provide a date/time and type." };

  const db = getDb();
  const lead = await db.prepare("SELECT * FROM leads WHERE id = ? AND assigned_agent_id = ?").get(parsed.data.leadId, user.id);
  if (!lead) return { error: "Lead not found." };

  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO appointments (lead_id, agent_id, scheduled_at, type, notes, status, created_at) VALUES (?, ?, ?, ?, ?, 'scheduled', ?)`
  ).run(parsed.data.leadId, user.id, new Date(parsed.data.scheduledAt).toISOString(), parsed.data.type, parsed.data.notes, now);
  await db.prepare("UPDATE leads SET status = 'appointment', updated_at = ? WHERE id = ?").run(now, parsed.data.leadId);

  // Spec trigger: "new appointment" — notify the agent's own inbox and the admins.
  const leadRow = lead as { first_name: string; last_name: string };
  const when = new Date(parsed.data.scheduledAt).toLocaleString("en-US");
  await createNotification(
    user.id,
    "appointment",
    "Appointment scheduled",
    `${parsed.data.type} with ${leadRow.first_name} ${leadRow.last_name} on ${when}.`
  );
  const apptAdmins = await db.prepare("SELECT id FROM users WHERE role IN ('admin','super_admin')").all() as { id: number }[];
  for (const a of apptAdmins) {
    await createNotification(
      a.id,
      "appointment",
      "New appointment booked",
      `${user.profile?.first_name ?? user.email} booked a ${parsed.data.type} with ${leadRow.first_name} ${leadRow.last_name} on ${when}.`
    );
  }

  await audit(user.id, user.role, "appointment_created", "appointment", parsed.data.leadId, { type: parsed.data.type });
  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/leads");
  return { ok: true };
}

const appointmentStatusSchema = z.object({
  id: z.coerce.number(),
  status: z.enum(["scheduled", "completed", "cancelled", "rescheduled"]),
});

export async function updateAppointmentStatusAction(prevState: unknown, formData: FormData) {
  const user = await getSessionUserFresh();
  if (!user || user.role !== "agent") return { error: "Not authorized." };
  const parsed = appointmentStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: "Invalid request." };

  const db = getDb();
  await db.prepare("UPDATE appointments SET status = ? WHERE id = ? AND agent_id = ?").run(parsed.data.status, parsed.data.id, user.id);
  await audit(user.id, user.role, "appointment_status_changed", "appointment", parsed.data.id, { to: parsed.data.status });
  revalidatePath("/dashboard/appointments");
  return { ok: true };
}

const profileSchema = z.object({
  phone: z.string().min(7),
  brokerage: z.string().min(1),
  primary_city: z.string().min(1),
  state: z.string().min(2),
  zip_codes: z.array(z.string()),
  service_radius: z.coerce.number().min(0),
  lead_type: z.enum(["buyer", "seller", "both"]),
  specialties: z.array(z.string()),
  preferred_contact: z.string(),
  working_hours: z.string(),
  weekend_availability: z.coerce.number(),
  bio: z.string(),
  website: z.string(),
});

export async function updateProfileAction(prevState: unknown, formData: FormData) {
  const user = await getSessionUserFresh();
  if (!user || user.role !== "agent") return { error: "Not authorized." };
  const zipRaw = (formData.get("zip_codes") as string) || "";
  const specRaw = (formData.get("specialties") as string) || "";

  const parsed = profileSchema.safeParse({
    phone: formData.get("phone"),
    brokerage: formData.get("brokerage"),
    primary_city: formData.get("primary_city"),
    state: formData.get("state"),
    zip_codes: zipRaw.split(",").map((s: string) => s.trim()).filter(Boolean),
    service_radius: formData.get("service_radius"),
    lead_type: formData.get("lead_type"),
    specialties: specRaw.split(",").map((s: string) => s.trim()).filter(Boolean),
    preferred_contact: formData.get("preferred_contact"),
    working_hours: formData.get("working_hours"),
    weekend_availability: formData.get("weekend_availability"),
    bio: formData.get("bio"),
    website: formData.get("website"),
  });
  if (!parsed.success) return { error: "Please complete the profile form correctly." };

  const db = getDb();
  const now = new Date().toISOString();
  await db.prepare(
    `UPDATE agent_profiles SET phone = ?, brokerage = ?, primary_city = ?, state = ?, zip_codes = ?, service_radius = ?, lead_type = ?, specialties = ?, preferred_contact = ?, working_hours = ?, weekend_availability = ?, bio = ?, website = ?, updated_at = ? WHERE user_id = ?`
  ).run(
    parsed.data.phone, parsed.data.brokerage, parsed.data.primary_city, parsed.data.state,
    JSON.stringify(parsed.data.zip_codes), parsed.data.service_radius, parsed.data.lead_type,
    JSON.stringify(parsed.data.specialties), parsed.data.preferred_contact, parsed.data.working_hours,
    parsed.data.weekend_availability, parsed.data.bio, parsed.data.website, now, user.id
  );
  await audit(user.id, user.role, "profile_updated", "agent_profile", user.id);
  revalidatePath("/dashboard/profile");
  return { ok: true };
}

const passwordSchema = z.object({
  current: z.string().min(1),
  next: z.string().min(8),
});

export async function changePasswordAction(prevState: unknown, formData: FormData) {
  const user = await getSessionUserFresh();
  if (!user) return { error: "Not authorized." };
  const parsed = passwordSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
  });
  if (!parsed.success) return { error: "New password must be at least 8 characters." };
  const db = getDb();
  const row = await db.prepare("SELECT password_hash FROM users WHERE id = ?").get(user.id) as { password_hash: string };
  if (!verifyPassword(parsed.data.current, row.password_hash)) return { error: "Current password is incorrect." };
  await db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(hashPassword(parsed.data.next), new Date().toISOString(), user.id);
  await audit(user.id, user.role, "password_changed", "user", user.id);
  return { ok: true };
}

const settingsSchema = z.object({
  notify_email: z.coerce.number(),
  notify_sms: z.coerce.number(),
});

export async function updateNotificationSettingsAction(prevState: unknown, formData: FormData) {
  const user = await getSessionUserFresh();
  if (!user) return { error: "Not authorized." };
  const parsed = settingsSchema.safeParse({
    notify_email: formData.get("notify_email"),
    notify_sms: formData.get("notify_sms"),
  });
  if (!parsed.success) return { error: "Invalid settings." };
  const db = getDb();
  await db.prepare(
    `INSERT INTO user_settings (user_id, notify_email, notify_sms, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET notify_email = excluded.notify_email, notify_sms = excluded.notify_sms, updated_at = excluded.updated_at`
  ).run(user.id, parsed.data.notify_email, parsed.data.notify_sms, new Date().toISOString());
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function markNotificationsReadAction() {
  const user = await getSessionUserFresh();
  if (!user) return { error: "Not authorized." };
  await getDb().prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL").run(new Date().toISOString(), user.id);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notifications");
  return { ok: true };
}

/** Void-returning variant usable directly as a `<form action={...}>` handler. */
export async function markAllAgentNotificationsReadAction() {
  const user = await getSessionUserFresh();
  if (!user) return;
  await getDb()
    .prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL")
    .run(new Date().toISOString(), user.id);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notifications");
}

export async function markOneNotificationReadAction(formData: FormData) {
  const user = await getSessionUserFresh();
  if (!user) return;
  const id = Number(formData.get("id"));
  if (!id) return;
  await getDb()
    .prepare("UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL")
    .run(new Date().toISOString(), id, user.id);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notifications");
}

export async function acceptAgreementAction(formData: FormData) {
  const user = await getSessionUserFresh();
  if (!user || user.role !== "agent") return;
  const version = String(formData.get("version") || "").trim();
  if (!version) return;
  const now = new Date().toISOString();
  await getDb()
    .prepare("UPDATE users SET agreement_accepted_at = ?, agreement_version = ?, updated_at = ? WHERE id = ?")
    .run(now, version, now, user.id);
  await audit(user.id, user.role, "agreement_accepted", "user", user.id, { version });
  revalidatePath("/dashboard/documents");
}
