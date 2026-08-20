"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getDb, REFERRAL_FEE_RATE } from "@/lib/db";
import { getSessionUserFresh } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { createNotification } from "@/lib/notifier";
import { assignLead } from "@/lib/assignment";
import { LEAD_STATUSES, REFERRAL_FEE_STATUSES, TRANSACTION_STATUSES } from "@/lib/constants";

function requireAdminUser() {
  return getSessionUserFresh();
}

const leadSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(7),
  lead_type: z.enum(["buyer", "seller"]),
  specialty: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(2),
  zip: z.string().min(3),
  budget_min: z.string().optional().nullable(),
  budget_max: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  source: z.string().min(1),
});

async function insertLeadRow(db: ReturnType<typeof getDb>, data: Record<string, unknown>, createdBy: number): Promise<number> {
  const now = new Date().toISOString();
  const row = (await db
    .prepare(
      `INSERT INTO leads (first_name, last_name, email, phone, lead_type, specialty, city, state, zip, budget_min, budget_max, notes, source, status, assigned_agent_id, created_by, created_at, updated_at)
       VALUES (@first_name, @last_name, @email, @phone, @lead_type, @specialty, @city, @state, @zip, @budget_min, @budget_max, @notes, @source, 'new', NULL, @created_by, @created_at, @updated_at)
       RETURNING id`
    )
    .get({
      ...data,
      budget_min: data.budget_min ? Number(data.budget_min) : null,
      budget_max: data.budget_max ? Number(data.budget_max) : null,
      created_by: createdBy,
      created_at: now,
      updated_at: now,
    })) as { id: number };
  return row.id;
}

export async function createLeadAction(prevState: unknown, formData: FormData) {
  const admin = await requireAdminUser();
  if (!admin || admin.role === "agent") return { error: "Not authorized." };

  const parsed = leadSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    lead_type: formData.get("lead_type"),
    specialty: formData.get("specialty"),
    city: formData.get("city"),
    state: formData.get("state"),
    zip: formData.get("zip"),
    budget_min: formData.get("budget_min") || null,
    budget_max: formData.get("budget_max") || null,
    notes: formData.get("notes") || null,
    source: formData.get("source"),
  });
  if (!parsed.success) {
    return { error: "Please complete all required lead fields." };
  }

  const db = getDb();
  const leadId = Number(insertLeadRow(db, parsed.data, admin.id));
  await audit(admin.id, admin.role, "lead_created", "lead", leadId, { source: parsed.data.source });

  const autoAssign = formData.get("auto_assign") === "1";
  if (autoAssign) {
    const result = await assignLead(leadId, admin.id);
    if (!result.assigned) {
      await createNotification(admin.id, "assignment", "Lead created", `${parsed.data.first_name} ${parsed.data.last_name} could not be auto-assigned (no eligible agent).`);
    }
  }

  revalidatePath("/admin/leads");
  return { ok: true, leadId };
}

export async function updateLeadAction(prevState: unknown, formData: FormData) {
  const admin = await requireAdminUser();
  if (!admin || admin.role === "agent") return { error: "Not authorized." };
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));

  const parsed = leadSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    lead_type: formData.get("lead_type"),
    specialty: formData.get("specialty"),
    city: formData.get("city"),
    state: formData.get("state"),
    zip: formData.get("zip"),
    budget_min: formData.get("budget_min") || null,
    budget_max: formData.get("budget_max") || null,
    notes: formData.get("notes") || null,
    source: formData.get("source"),
  });
  if (!parsed.success) return { error: "Invalid lead data." };
  if (!LEAD_STATUSES.includes(status as (typeof LEAD_STATUSES)[number])) return { error: "Invalid status." };

  const db = getDb();
  await db.prepare(
    `UPDATE leads SET first_name = ?, last_name = ?, email = ?, phone = ?, lead_type = ?, specialty = ?, city = ?, state = ?, zip = ?, budget_min = ?, budget_max = ?, notes = ?, source = ?, status = ?, updated_at = ? WHERE id = ?`
  ).run(
    parsed.data.first_name, parsed.data.last_name, parsed.data.email, parsed.data.phone,
    parsed.data.lead_type, parsed.data.specialty, parsed.data.city, parsed.data.state, parsed.data.zip,
    parsed.data.budget_min ? Number(parsed.data.budget_min) : null,
    parsed.data.budget_max ? Number(parsed.data.budget_max) : null,
    parsed.data.notes, parsed.data.source, status, new Date().toISOString(), id
  );
  await audit(admin.id, admin.role, "lead_updated", "lead", id, { status });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/leads/" + id);
  return { ok: true };
}

export async function reassignLeadAction(prevState: unknown, formData: FormData) {
  const admin = await requireAdminUser();
  if (!admin || admin.role === "agent") return { error: "Not authorized." };
  const leadId = Number(formData.get("leadId"));
  const agentId = Number(formData.get("agentId"));
  if (!leadId || !agentId) return { error: "Select an agent." };

  const db = getDb();
  const lead = await db.prepare("SELECT first_name, last_name FROM leads WHERE id = ?").get(leadId) as { first_name: string; last_name: string } | undefined;
  if (!lead) return { error: "Lead not found." };

  await db.prepare(
    "INSERT INTO lead_assignments (lead_id, agent_id, assigned_by, reason, assigned_at, reassigned_from_id) VALUES (?, ?, ?, 'Manual reassignment', ?, ?)"
  ).run(leadId, agentId, admin.id, new Date().toISOString(), null);
  await db.prepare("UPDATE leads SET assigned_agent_id = ?, status = 'new', response_due_at = ?, updated_at = ? WHERE id = ?")
    .run(agentId, new Date(Date.now() + 24 * 3600000).toISOString(), new Date().toISOString(), leadId);

  await createNotification(agentId, "lead_assignment", "Lead assigned to you", `${lead.first_name} ${lead.last_name} was assigned to you.`);
  await audit(admin.id, admin.role, "lead_reassigned", "lead", leadId, { agentId });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/leads/" + leadId);
  return { ok: true };
}

export async function autoAssignLeadAction(prevState: unknown, formData: FormData) {
  const admin = await requireAdminUser();
  if (!admin || admin.role === "agent") return { error: "Not authorized." };
  const leadId = Number(formData.get("leadId"));
  const result = await assignLead(leadId, admin.id);
  if (!result.assigned) return { error: "No eligible agent could be matched." };
  revalidatePath("/admin/leads");
  revalidatePath("/admin/leads/" + leadId);
  return { ok: true };
}

export async function unassignLeadAction(prevState: unknown, formData: FormData) {
  const admin = await requireAdminUser();
  if (!admin || admin.role === "agent") return { error: "Not authorized." };
  const leadId = Number(formData.get("leadId"));
  await getDb().prepare("UPDATE leads SET assigned_agent_id = NULL, response_due_at = NULL, updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), leadId);
  await audit(admin.id, admin.role, "lead_unassigned", "lead", leadId);
  revalidatePath("/admin/leads");
  return { ok: true };
}

export async function reviewAgentAction(prevState: unknown, formData: FormData) {
  const admin = await requireAdminUser();
  if (!admin || admin.role === "agent") return { error: "Not authorized." };
  const userId = Number(formData.get("userId"));
  const licenseVerified = formData.get("license_verified") === "1" ? 1 : 0;
  const marketApproved = formData.get("market_approved") === "1" ? 1 : 0;
  const status = String(formData.get("status"));

  if (!["pending", "active", "suspended"].includes(status)) return { error: "Invalid status." };

  const db = getDb();
  await db.prepare("UPDATE users SET license_verified = ?, market_approved = ?, status = ?, updated_at = ? WHERE id = ?")
    .run(licenseVerified, marketApproved, status, new Date().toISOString(), userId);
  const agent = await db.prepare("SELECT email FROM users WHERE id = ?").get(userId) as { email: string } | undefined;
  await audit(admin.id, admin.role, "agent_reviewed", "user", userId, { licenseVerified, marketApproved, status });

  if (licenseVerified && marketApproved && status === "active") {
    await createNotification(userId, "account_approval", "You're approved", "Your account is approved and active. You can now receive leads.");
    if (agent) await createNotification(userId, "account_approval", "You're approved", "Your account is approved and active.", "email");
  } else {
    await createNotification(userId, "account_update", "Account status updated", `Your account status is now "${status}".`);
  }
  revalidatePath("/admin/agents");
  revalidatePath("/admin/agents/" + userId);
  return { ok: true };
}

const zipSchema = z.object({
  zip: z.string().min(3).max(10),
  city: z.string().min(1),
  state: z.string().min(2),
  market: z.string().min(1),
});

export async function addZipAction(prevState: unknown, formData: FormData) {
  const admin = await requireAdminUser();
  if (!admin || admin.role === "agent") return { error: "Not authorized." };
  const parsed = zipSchema.safeParse({
    zip: formData.get("zip"),
    city: formData.get("city"),
    state: formData.get("state"),
    market: formData.get("market"),
  });
  if (!parsed.success) return { error: "Enter a valid ZIP, city, and state." };
  await getDb()
    .prepare(`INSERT INTO zip_codes (zip, city, state, market, active, created_at) VALUES (?, ?, ?, ?, 1, ?)`)
    .run(parsed.data.zip, parsed.data.city, parsed.data.state, parsed.data.market, new Date().toISOString());
  await audit(admin.id, admin.role, "zip_added", "zip_codes", parsed.data.zip);
  revalidatePath("/admin/zipcodes");
  return { ok: true };
}

export async function toggleZipAction(formData: FormData) {
  const admin = await requireAdminUser();
  if (!admin || admin.role === "agent") return;
  const id = Number(formData.get("id"));
  const zip = await getDb().prepare("SELECT active FROM zip_codes WHERE id = ?").get(id) as { active: number } | undefined;
  if (!zip) return;
  await getDb().prepare("UPDATE zip_codes SET active = ? WHERE id = ?").run(zip.active ? 0 : 1, id);
  await audit(admin.id, admin.role, "zip_toggled", "zip_codes", id);
  revalidatePath("/admin/zipcodes");
}

export async function deleteZipAction(formData: FormData) {
  const admin = await requireAdminUser();
  if (!admin || admin.role === "agent") return;
  const id = Number(formData.get("id"));
  await getDb().prepare("DELETE FROM zip_codes WHERE id = ?").run(id);
  await audit(admin.id, admin.role, "zip_deleted", "zip_codes", id);
  revalidatePath("/admin/zipcodes");
}

const transactionSchema = z.object({
  lead_id: z.coerce.number(),
  agent_id: z.coerce.number(),
  client_name: z.string().min(1),
  property_address: z.string().min(1),
  estimated_value: z.coerce.number().min(0),
  status: z.enum(TRANSACTION_STATUSES),
  gross_commission: z.coerce.number().min(0),
});

export async function createTransactionAction(prevState: unknown, formData: FormData) {
  const admin = await requireAdminUser();
  if (!admin || admin.role === "agent") return { error: "Not authorized." };
  const parsed = transactionSchema.safeParse({
    lead_id: formData.get("lead_id"),
    agent_id: formData.get("agent_id"),
    client_name: formData.get("client_name"),
    property_address: formData.get("property_address"),
    estimated_value: formData.get("estimated_value"),
    status: formData.get("status"),
    gross_commission: formData.get("gross_commission"),
  });
  if (!parsed.success) return { error: "Please complete all transaction fields." };

  const referralFee = Math.round(parsed.data.gross_commission * REFERRAL_FEE_RATE);
  const now = new Date().toISOString();
  const feeStatus = parsed.data.status === "closed" ? "closed_fee_due" : parsed.data.status === "under_contract" ? "under_contract" : "pending";
  const inserted = (await getDb()
    .prepare(
      `INSERT INTO transactions (lead_id, agent_id, client_name, property_address, estimated_value, status, under_contract_date, closing_date, gross_commission, referral_fee, referral_fee_status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
       RETURNING id`
    )
    .get(
      parsed.data.lead_id, parsed.data.agent_id, parsed.data.client_name, parsed.data.property_address,
      parsed.data.estimated_value, parsed.data.status,
      parsed.data.status === "under_contract" || parsed.data.status === "closed" ? now : null,
      parsed.data.status === "closed" ? now : null,
      parsed.data.gross_commission, referralFee, feeStatus, now, now
    )) as { id: number };
  const id = inserted.id;
  await getDb().prepare("UPDATE leads SET status = ? WHERE id = ?").run(
    parsed.data.status === "closed" ? "closed" : "under_contract",
    parsed.data.lead_id
  );
  await createNotification(parsed.data.agent_id, "transaction", "Transaction recorded", `A transaction was recorded for ${parsed.data.client_name}.`);
  await audit(admin.id, admin.role, "transaction_created", "transaction", id, { referralFee });
  revalidatePath("/admin/transactions");
  revalidatePath("/admin/leads");
  return { ok: true };
}

const transactionUpdateSchema = z.object({
  id: z.coerce.number(),
  status: z.enum(TRANSACTION_STATUSES),
  fee_status: z.enum(REFERRAL_FEE_STATUSES),
  gross_commission: z.coerce.number().min(0),
});

export async function updateTransactionAction(prevState: unknown, formData: FormData) {
  const admin = await requireAdminUser();
  if (!admin || admin.role === "agent") return { error: "Not authorized." };
  const parsed = transactionUpdateSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    fee_status: formData.get("fee_status"),
    gross_commission: formData.get("gross_commission"),
  });
  if (!parsed.success) return { error: "Invalid transaction update." };

  const db = getDb();
  const now = new Date().toISOString();
  const referralFee = Math.round(parsed.data.gross_commission * REFERRAL_FEE_RATE);
  const existing = await db.prepare("SELECT * FROM transactions WHERE id = ?").get(parsed.data.id) as
    | { lead_id: number; agent_id: number; closing_date: string | null } | undefined;
  if (!existing) return { error: "Transaction not found." };

  await db.prepare(
    `UPDATE transactions SET status = ?, gross_commission = ?, referral_fee = ?, referral_fee_status = ?, closing_date = ?, updated_at = ? WHERE id = ?`
  ).run(
    parsed.data.status, parsed.data.gross_commission, referralFee, parsed.data.fee_status,
    parsed.data.status === "closed" ? now : existing.closing_date, now, parsed.data.id
  );

  if (parsed.data.fee_status === "paid") {
    await createNotification(
      existing.agent_id,
      "payment",
      "Referral fee paid",
      `Your referral fee of $${referralFee.toLocaleString()} was marked as paid. Thank you.`,
      "in_app",
      `fee_paid:${parsed.data.id}`
    );
  }
  if (parsed.data.status === "under_contract") {
    await createNotification(
      existing.agent_id,
      "contract_entered",
      "Transaction under contract",
      "Your referred transaction was marked under contract. Keep the closing date up to date so we can track the referral fee.",
      "in_app",
      `under_contract:${parsed.data.id}`
    );
  }
  await audit(admin.id, admin.role, "transaction_updated", "transaction", parsed.data.id, { status: parsed.data.status, fee: parsed.data.fee_status });
  revalidatePath("/admin/transactions");
  revalidatePath("/admin/reports");
  return { ok: true };
}

export async function sendAdminNotificationAction(prevState: unknown, formData: FormData) {
  const admin = await requireAdminUser();
  if (!admin || admin.role === "agent") return { error: "Not authorized." };
  const userId = Number(formData.get("userId"));
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  if (!title || !body) return { error: "Title and message are required." };
  await createNotification(userId, "admin_message", title, body, "in_app");
  await createNotification(userId, "admin_message", title, body, "email");
  await audit(admin.id, admin.role, "notification_sent", "notification", userId, { title });
  revalidatePath("/admin/notifications");
  return { ok: true };
}

export async function markNotificationReadAction(formData: FormData) {
  const user = await getSessionUserFresh();
  if (!user || user.role === "agent") return;
  const id = Number(formData.get("id"));
  if (!id) return;
  await getDb()
    .prepare("UPDATE notifications SET read_at = ? WHERE id = ? AND read_at IS NULL")
    .run(new Date().toISOString(), id);
  revalidatePath("/admin/notifications");
}

export async function markAllNotificationsReadAction() {
  const user = await getSessionUserFresh();
  if (!user || user.role === "agent") return;
  await getDb()
    .prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL")
    .run(new Date().toISOString(), user.id);
  revalidatePath("/admin/notifications");
}

const agreementSchema = z.object({
  version: z.string().min(1).max(20),
  title: z.string().min(1),
  body: z.string().min(50),
  referral_rate: z.coerce.number().min(0).max(1),
  effective_date: z.string().min(1),
});

/**
 * Publishes a new referral agreement version and makes it the active one.
 * Existing agents keep their recorded acceptance of the prior version; the
 * Documents page prompts them to re-accept when the active version moves on.
 */
export async function publishAgreementAction(prevState: unknown, formData: FormData) {
  const admin = await requireAdminUser();
  if (!admin || admin.role === "agent") return { error: "Not authorized." };
  if (admin.role !== "super_admin") return { error: "Only a super admin can publish an agreement version." };

  const rateRaw = String(formData.get("referral_rate") ?? "20");
  const parsed = agreementSchema.safeParse({
    version: formData.get("version"),
    title: formData.get("title"),
    body: formData.get("body"),
    referral_rate: Number(rateRaw) / 100,
    effective_date: formData.get("effective_date"),
  });
  if (!parsed.success) {
    return { error: "Provide a version, title, effective date and agreement body (min 50 characters)." };
  }

  const db = getDb();
  const clash = await db.prepare("SELECT id FROM agreement_versions WHERE version = ?").get(parsed.data.version);
  if (clash) return { error: `Version ${parsed.data.version} already exists.` };

  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx.prepare("UPDATE agreement_versions SET active = 0").run();
    await tx.prepare(
      `INSERT INTO agreement_versions (version, title, body, referral_rate, effective_date, active, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
    ).run(
      parsed.data.version,
      parsed.data.title,
      parsed.data.body,
      parsed.data.referral_rate,
      new Date(parsed.data.effective_date).toISOString(),
      admin.id,
      now
    );
  });

  const agents = await db.prepare("SELECT id FROM users WHERE role = 'agent'").all() as { id: number }[];
  for (const a of agents) {
    await createNotification(
      a.id,
      "agreement_update",
      "Referral agreement updated",
      `Version ${parsed.data.version} of the referral agreement is now in effect. Review and accept it on your Documents page.`,
      "in_app",
      `agreement:${parsed.data.version}:${a.id}`
    );
  }

  await audit(admin.id, admin.role, "agreement_published", "agreement", parsed.data.version, {
    rate: parsed.data.referral_rate,
  });
  revalidatePath("/admin/agreements");
  revalidatePath("/dashboard/documents");
  return { ok: true };
}

export async function activateAgreementAction(formData: FormData) {
  const admin = await requireAdminUser();
  if (!admin || admin.role !== "super_admin") return;
  const id = Number(formData.get("id"));
  if (!id) return;
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.prepare("UPDATE agreement_versions SET active = 0").run();
    await tx.prepare("UPDATE agreement_versions SET active = 1 WHERE id = ?").run(id);
  });
  await audit(admin.id, admin.role, "agreement_activated", "agreement", id);
  revalidatePath("/admin/agreements");
  revalidatePath("/dashboard/documents");
}

/**
 * Removes one row from the activation payment history on /admin/payments.
 *
 * Only the payment record goes: the agent's account, profile and activation
 * stage are untouched, so deleting a test or duplicate charge never locks
 * someone out of the app.
 */
export async function deleteActivationPaymentAction(formData: FormData) {
  const admin = await requireAdminUser();
  if (!admin || admin.role === "agent") return { error: "Not authorized." };
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { error: "Invalid payment record." };

  const db = getDb();
  const payment = (await db
    .prepare("SELECT reference, user_id, amount FROM activation_payments WHERE id = ?")
    .get(id)) as { reference: string; user_id: number; amount: number } | undefined;
  if (!payment) return { error: "That payment record no longer exists." };

  await db.prepare("DELETE FROM activation_payments WHERE id = ?").run(id);
  await audit(admin.id, admin.role, "activation_payment_deleted", "activation_payment", id, {
    reference: payment.reference,
    userId: payment.user_id,
    amount: payment.amount,
  });
  revalidatePath("/admin/payments");
  return { ok: true };
}

/**
 * Clears one in-progress checkout from the live view. These rows are written by
 * the join form as it is typed, so the panel collects abandoned and test
 * attempts; this is how an admin tidies them away.
 */
export async function deleteCheckoutSessionAction(formData: FormData) {
  const admin = await requireAdminUser();
  if (!admin || admin.role === "agent") return { error: "Not authorized." };
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { error: "Invalid checkout session." };

  const result = await getDb().prepare("DELETE FROM checkout_sessions WHERE id = ?").run(id);
  if (!result.changes) return { error: "That checkout is already gone." };
  await audit(admin.id, admin.role, "checkout_session_deleted", "checkout_session", id);
  revalidatePath("/admin/payments");
  return { ok: true };
}
