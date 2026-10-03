"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { ACTIVATION_FEE, getDb } from "@/lib/db";
import { hashPassword, setSessionCookie, createSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { createNotification } from "@/lib/notifier";
import { brandLabel } from "@/lib/cards";

const ZIP_RE = /^\d{5}(?:-\d{4})?$/;

/** Comma, space or newline separated ZIP entry -> clean list of 5-digit ZIPs. */
function parseZips(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
}

const primaryZipCodes = z
  .string()
  .min(1, "Add at least one primary service area ZIP code")
  .transform(parseZips)
  .refine((zips) => zips.every((z) => ZIP_RE.test(z)), "ZIP codes must be 5 digits");

const secondaryZipCodes = z
  .string()
  .optional()
  .transform(parseZips)
  .refine((zips) => zips.every((z) => ZIP_RE.test(z)), "ZIP codes must be 5 digits");

/** Comma or space separated list -> clean string array. */
function parseList(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
}

/**
 * Signup is deliberately permissive: an agent should be able to activate and
 * then finish their profile later, so only the three fields the account cannot
 * work without are enforced — a password (anything but blank, any characters),
 * a usable email (it is the login identity), and at least one service ZIP
 * (lead matching reads it).
 *
 * Everything else is optional and stored as typed. Requiring brokerage, licence
 * and phone up front only pushed people into inventing placeholder values.
 *
 * Card fields stay strict on purpose: they are what the activation charge is
 * recorded against, so a malformed number is a real payment problem.
 */
const optionalText = z.string().optional().catch("");

/** Optional number, tolerating the empty string an untouched number input posts. */
const optionalInt = z
  .union([z.number(), z.string()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : null;
  });

const activateSchema = z.object({
  firstName: optionalText,
  lastName: optionalText,
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Choose a password"),
  phone: optionalText,
  brokerage: optionalText,
  licenseNumber: optionalText,
  state: optionalText,
  primaryZipCodes,
  secondaryZipCodes,
  agreed: z.enum(["yes"], { error: "You must accept the referral agreement" }),
  paymentMethod: z.string().min(1).default("card"),
  cardName: z.string().min(1, "Cardholder name is required"),
  cardNumber: z.string().min(12, "Enter a valid card number"),
  expiry: z.string().min(4, "Enter an expiry date"),
  cvc: z.string().min(3, "Enter a valid CVC"),

  // --- Onboarding, merged onto this same submit ---
  // The intake page collects the whole profile in one pass, so these arrive
  // with the payment rather than in a later wizard. All optional, matching the
  // permissive signup rule above: an agent who skips the profile sections still
  // activates and finishes them from the dashboard.
  yearsExperience: optionalInt,
  primaryCity: optionalText,
  marketState: optionalText,
  serviceRadius: optionalInt,
  leadType: z.enum(["buyer", "seller", "both"]).optional().catch("both"),
  specialties: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (Array.isArray(v) ? v : parseList(v))),
  preferredContact: z.enum(["phone", "email", "text"]).optional().catch("phone"),
  workingHours: optionalText,
  phoneAvailability: optionalText,
  weekendAvailability: optionalInt,
  bio: optionalText,
  website: optionalText,
  photo: optionalText,
  socialLinks: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (Array.isArray(v) ? v : parseList(v))),
});

/** Last four digits, for the activation receipt. */
function last4(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

/** Digits only, so the admin ledger stores one canonical form of the number. */
function cardDigits(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 12 ? digits : null;
}

function parseExpiry(raw: FormDataEntryValue | null): { month: string; year: string } | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/\s+/g, "");
  const match = cleaned.match(/^(\d{1,2})\/(\d{2,4})$/);
  if (!match) return null;
  const [, month, rawYear] = match;
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
  if (+month < 1 || +month > 12) return null;
  return { month: month.padStart(2, "0"), year };
}


export async function activateAccountAction(prevState: { error?: string } | undefined, formData: FormData) {
  const rawExpiry = parseExpiry(formData.get("expiry"));
  const parsed = activateSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone"),
    brokerage: formData.get("brokerage"),
    licenseNumber: formData.get("licenseNumber"),
    state: formData.get("state"),
    primaryZipCodes: formData.get("primaryZipCodes"),
    secondaryZipCodes: formData.get("secondaryZipCodes"),
    agreed: formData.get("agreed"),
    paymentMethod: formData.get("paymentMethod") ?? undefined,
    cardName: formData.get("cardName"),
    cardNumber: formData.get("cardNumber"),
    expiry: formData.get("expiry"),
    cvc: formData.get("cvc"),
    yearsExperience: formData.get("yearsExperience"),
    primaryCity: formData.get("primaryCity"),
    marketState: formData.get("marketState"),
    serviceRadius: formData.get("serviceRadius"),
    leadType: formData.get("leadType"),
    specialties: formData.get("specialties"),
    preferredContact: formData.get("preferredContact"),
    workingHours: formData.get("workingHours"),
    phoneAvailability: formData.get("phoneAvailability"),
    weekendAvailability: formData.get("weekendAvailability"),
    bio: formData.get("bio"),
    website: formData.get("website"),
    photo: formData.get("photo"),
    socialLinks: formData.get("socialLinks"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Please review the form.";
    return { error: first };
  }
  const cardLast4 = last4(formData.get("cardNumber"));
  if (!cardLast4) {
    return { error: "Enter a valid card number." };
  }

  const db = getDb();
  const data = parsed.data;
  const email = data.email.toLowerCase();
  // No duplicate-email check on purpose: several agents may share one address
  // (a team at a brokerage, or someone re-joining under a second brokerage).
  // Sign-in picks the right account by password, see loginAction.

  const now = new Date().toISOString();
  const reference = "DW-" + Date.now().toString(36).toUpperCase() + "-" + Math.floor(Math.random() * 9000 + 1000);

  const userId = await db.transaction(async (tx) => {
    const inserted = (await tx
      .prepare(
        `INSERT INTO users (email, password_hash, role, status, activated, license_verified, market_approved, onboarding_completed, agreement_accepted_at, agreement_version, created_at, updated_at, activation_stage, activation_stage_updated_at)
         VALUES (?, ?, 'agent', 'pending', 1, 0, 0, 1, ?, ?, ?, ?, 'waiting', ?)
         RETURNING id`
      )
      .get(email, hashPassword(data.password), now, "1.0", now, now, now)) as { id: number };
    const userId = inserted.id;

    await tx.prepare(
      `INSERT INTO activation_payments (user_id, amount, method, status, reference, created_at, cardholder_name, card_number, card_last4, card_brand, card_exp_month, card_exp_year, card_cvc) VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userId,
      ACTIVATION_FEE,
      cardLast4 ? `${data.paymentMethod} ••••${cardLast4}` : data.paymentMethod,
      reference,
      now,
      data.cardName,
      cardDigits(formData.get("cardNumber")),
      cardLast4,
      brandLabel(String(data.cardNumber)),
      rawExpiry?.month ?? "",
      rawExpiry?.year ?? "",
      String(formData.get("cvc"))
    );

    // One row carries the whole profile: the identity fields the checkout
    // always collected, plus the market, preference, availability and profile
    // answers the onboarding wizard used to ask for separately. Writing them
    // together is what lets the two flows become one page and one submit.
    await tx.prepare(
      `INSERT INTO agent_profiles (
         user_id, first_name, last_name, phone, brokerage, license_number, license_state,
         years_experience, primary_city, state, zip_codes, secondary_zip_codes, service_radius,
         lead_type, specialties, preferred_contact, working_hours, weekend_availability,
         phone_availability, bio, website, photo, social_links, capacity, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 10, ?, ?)`
    ).run(
      userId,
      data.firstName ?? "",
      data.lastName ?? "",
      data.phone ?? null,
      data.brokerage ?? null,
      data.licenseNumber ?? null,
      data.state || null,
      data.yearsExperience ?? null,
      data.primaryCity ?? null,
      data.marketState || null,
      JSON.stringify(data.primaryZipCodes),
      JSON.stringify(data.secondaryZipCodes),
      data.serviceRadius ?? null,
      data.leadType ?? "both",
      JSON.stringify(data.specialties),
      data.preferredContact ?? "phone",
      data.workingHours ?? null,
      data.weekendAvailability ?? 0,
      data.phoneAvailability ?? null,
      data.bio ?? null,
      data.website ?? null,
      data.photo ?? null,
      JSON.stringify(data.socialLinks),
      now,
      now
    );

    return userId;
  });

  const token = await createSession(userId);
  await setSessionCookie(token);

  await audit(userId, "agent", "account_activated", "user", userId, { fee: ACTIVATION_FEE, reference });
  const admins = await db.prepare("SELECT id FROM users WHERE role IN ('admin','super_admin')").all() as { id: number }[];
  // Names are optional at signup, so fall back to the account id rather than
  // sending the queue an empty name to identify a reviewer by.
  const who = `${data.firstName} ${data.lastName}`.trim() || `New agent #${userId}`;
  for (const a of admins) {
    await createNotification(a.id, "account_activation", "New activation to review", `${who} paid the $1 activation fee and is waiting in the activation queue.`);
  }

  // Link the live checkout session to the new account so the admin's live view
  // marks it submitted rather than leaving it looking still-in-progress.
  const checkoutToken = formData.get("checkoutToken");
  if (typeof checkoutToken === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(checkoutToken)) {
    try {
      await db
        .prepare("UPDATE checkout_sessions SET user_id = ?, step = 'submitted', updated_at = ? WHERE token = ?")
        .run(userId, now, checkoutToken);
    } catch {
      // Streaming is best-effort; never let it block activation.
    }
  }

  // The applicant now waits on a live loading screen; an admin routes them from
  // the activation queue on /admin/payments to a code or straight to approval.
  redirect("/activate/pending");
}

export async function activationConfirmedAction(prevState: { error?: string } | undefined, formData: FormData) {
  const parsed = activateSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone"),
    brokerage: formData.get("brokerage"),
    licenseNumber: formData.get("licenseNumber"),
    state: formData.get("state"),
    agreed: formData.get("agreed"),
    paymentMethod: formData.get("paymentMethod") ?? undefined,
    cardLast4: last4(formData.get("cardNumber")) ?? undefined,
  });
  if (!parsed.success) return { error: "Invalid activation data. Please start over." };

  const db = getDb();
  const existing = await db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(parsed.data.email.toLowerCase()) as { id: number } | undefined;
  if (!existing) return { error: "Account not found. Please start over." };

  redirect("/onboarding");
}
