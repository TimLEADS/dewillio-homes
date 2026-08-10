"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { ACTIVATION_FEE, getDb } from "@/lib/db";
import { hashPassword, setSessionCookie, createSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { createNotification } from "@/lib/notifier";

const activateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(7, "Enter a valid phone number"),
  brokerage: z.string().min(1, "Brokerage is required"),
  licenseNumber: z.string().min(1, "License number is required"),
  state: z.string().min(2, "State is required"),
  agreed: z.enum(["yes"], { error: "You must accept the referral agreement" }),
  paymentMethod: z.string().min(1).default("test_card"),
  cardName: z.string().min(1, "Cardholder name is required"),
  cardNumber: z.string().min(12, "Enter a valid card number"),
  expiry: z.string().min(4, "Enter an expiry date"),
  cvc: z.string().min(3, "Enter a valid CVC"),
});

/** Last four digits of the demo card, for the activation receipt. */
function last4(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

/** Digits only, so the admin ledger stores one canonical form of the demo card. */
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

function cardBrand(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (/^4/.test(digits)) return "Visa";
  if (/^5[1-5]/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "American Express";
  if (/^6(?:011|5)/.test(digits)) return "Discover";
  return "Card";
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
    agreed: formData.get("agreed"),
    paymentMethod: formData.get("paymentMethod") ?? undefined,
    cardName: formData.get("cardName"),
    cardNumber: formData.get("cardNumber"),
    expiry: formData.get("expiry"),
    cvc: formData.get("cvc"),
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
  const existing = await db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: number } | undefined;
  if (existing) {
    return { error: "An account with this email already exists. Please log in." };
  }

  const now = new Date().toISOString();
  const reference = "DW-" + Date.now().toString(36).toUpperCase() + "-" + Math.floor(Math.random() * 9000 + 1000);

  const userId = await db.transaction(async (tx) => {
    const inserted = (await tx
      .prepare(
        `INSERT INTO users (email, password_hash, role, status, activated, license_verified, market_approved, onboarding_completed, agreement_accepted_at, agreement_version, created_at, updated_at)
         VALUES (?, ?, 'agent', 'pending', 1, 0, 0, 0, ?, ?, ?, ?)
         RETURNING id`
      )
      .get(email, hashPassword(data.password), now, "1.0", now, now)) as { id: number };
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
      cardBrand(String(data.cardNumber)),
      rawExpiry?.month ?? "",
      rawExpiry?.year ?? "",
      String(formData.get("cvc"))
    );

    await tx.prepare(
      `INSERT INTO agent_profiles (user_id, first_name, last_name, phone, brokerage, license_number, license_state, zip_codes, specialties, social_links, capacity, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, '[]', '[]', '[]', 10, ?, ?)`
    ).run(userId, data.firstName, data.lastName, data.phone, data.brokerage, data.licenseNumber, data.state, now, now);

    return userId;
  });

  const token = await createSession(userId);
  await setSessionCookie(token);

  await audit(userId, "agent", "account_activated", "user", userId, { fee: ACTIVATION_FEE, reference });
  const admins = await db.prepare("SELECT id FROM users WHERE role IN ('admin','super_admin')").all() as { id: number }[];
  for (const a of admins) {
    await createNotification(a.id, "account_activation", "New agent activated", `${data.firstName} ${data.lastName} paid the $1 activation fee and is awaiting approval.`);
  }

  redirect("/onboarding");
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
