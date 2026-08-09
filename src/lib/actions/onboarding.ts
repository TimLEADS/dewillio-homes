"use server";

import { z } from "zod";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { createNotification } from "@/lib/notifier";

const professionalSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(7),
  brokerage: z.string().min(1),
  license_number: z.string().min(1),
  license_state: z.string().min(2),
  years_experience: z.coerce.number().min(0).max(60),
});

const marketSchema = z.object({
  primary_city: z.string().min(1),
  state: z.string().min(2),
  zip_codes: z.array(z.string().min(3)),
  service_radius: z.coerce.number().min(0).max(200),
});

const preferencesSchema = z.object({
  lead_type: z.enum(["buyer", "seller", "both"]),
  specialties: z.array(z.string()),
});

const availabilitySchema = z.object({
  phone_availability: z.string().default(""),
  preferred_contact: z.string().default("phone"),
  working_hours: z.string().default(""),
  weekend_availability: z.coerce.number().int().min(0).max(1),
});

const profileSchema = z.object({
  bio: z.string().default(""),
  website: z.string().default(""),
  social_links: z.array(z.string()).default([]),
  photo: z.string().default(""),
});

export async function saveStep(step: string, data: Record<string, unknown>) {
  const user = await getSessionUser();
  if (!user || user.role !== "agent") return { error: "Not authorized." };
  if (!user.activated) return { error: "Account not activated." };

  const db = getDb();
  const now = new Date().toISOString();

  const ensureRow = () => {
    const exists = db.prepare("SELECT user_id FROM agent_profiles WHERE user_id = ?").get(user.id);
    if (!exists) {
      db.prepare(
        `INSERT INTO agent_profiles (user_id, first_name, last_name, phone, brokerage, license_number, license_state, zip_codes, specialties, social_links, capacity, created_at, updated_at)
         VALUES (?, 'Unknown', '', NULL, NULL, NULL, NULL, '[]', '[]', '[]', 10, ?, ?)`
      ).run(user.id, now, now);
    }
  };

  try {
    if (step === "professional") {
      const v = professionalSchema.safeParse(data);
      if (!v.success) return { error: "Please complete all required professional fields." };
      ensureRow();
      db.prepare(
        `UPDATE agent_profiles SET first_name = ?, last_name = ?, phone = ?, brokerage = ?, license_number = ?, license_state = ?, years_experience = ?, updated_at = ? WHERE user_id = ?`
      ).run(v.data.first_name, v.data.last_name, v.data.phone, v.data.brokerage, v.data.license_number, v.data.license_state, v.data.years_experience, now, user.id);
      db.prepare("UPDATE users SET email = ?, updated_at = ? WHERE id = ?").run(v.data.email.toLowerCase(), now, user.id);
    } else if (step === "market") {
      const v = marketSchema.safeParse(data);
      if (!v.success) return { error: "Please provide your market details and at least one ZIP code." };
      ensureRow();
      db.prepare(
        `UPDATE agent_profiles SET primary_city = ?, state = ?, zip_codes = ?, service_radius = ?, updated_at = ? WHERE user_id = ?`
      ).run(v.data.primary_city, v.data.state, JSON.stringify(v.data.zip_codes), v.data.service_radius, now, user.id);
    } else if (step === "preferences") {
      const v = preferencesSchema.safeParse(data);
      if (!v.success) return { error: "Please select your lead preferences." };
      ensureRow();
      db.prepare(`UPDATE agent_profiles SET lead_type = ?, specialties = ?, updated_at = ? WHERE user_id = ?`)
        .run(v.data.lead_type, JSON.stringify(v.data.specialties), now, user.id);
    } else if (step === "availability") {
      const v = availabilitySchema.safeParse(data);
      if (!v.success) return { error: "Please complete availability." };
      ensureRow();
      db.prepare(
        `UPDATE agent_profiles SET phone_availability = ?, preferred_contact = ?, working_hours = ?, weekend_availability = ?, updated_at = ? WHERE user_id = ?`
      ).run(v.data.phone_availability, v.data.preferred_contact, v.data.working_hours, v.data.weekend_availability, now, user.id);
    } else if (step === "profile") {
      const v = profileSchema.safeParse(data);
      if (!v.success) return { error: "Invalid profile data." };
      ensureRow();
      db.prepare(
        `UPDATE agent_profiles SET bio = ?, website = ?, social_links = ?, photo = ?, updated_at = ? WHERE user_id = ?`
      ).run(v.data.bio, v.data.website, JSON.stringify(v.data.social_links), v.data.photo, now, user.id);
    } else {
      return { error: "Unknown step." };
    }
  } catch {
    return { error: "Could not save this step." };
  }

  audit(user.id, user.role, "onboarding_step", "agent_profile", user.id, { step });
  return { ok: true };
}

export async function submitOnboarding() {
  const user = await getSessionUser();
  if (!user || user.role !== "agent") return { error: "Not authorized." };

  const db = getDb();
  const profile = db.prepare("SELECT * FROM agent_profiles WHERE user_id = ?").get(user.id) as
    | { primary_city: string | null; zip_codes: string; specialties: string } | undefined;
  if (!profile || !profile.primary_city || JSON.parse(profile.zip_codes).length === 0) {
    return { error: "Complete your market details before submitting." };
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE users SET onboarding_completed = 1, updated_at = ? WHERE id = ?").run(now, user.id);
  audit(user.id, user.role, "onboarding_submitted", "user", user.id);

  const admins = db.prepare("SELECT id FROM users WHERE role IN ('admin','super_admin')").all() as { id: number }[];
  for (const a of admins) {
    createNotification(a.id, "agent_review", "Onboarding submitted for review", `${profile.primary_city} agent requires license verification and market approval.`);
  }

  return { ok: true };
}

export async function resubmitForReview() {
  const user = await getSessionUser();
  if (!user || user.role !== "agent") return { error: "Not authorized." };
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare("UPDATE users SET license_verified = 0, market_approved = 0, updated_at = ? WHERE id = ?").run(now, user.id);
  return { ok: true };
}
