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

  // Anything touched in the last 30 minutes is "live enough" to show.
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const sessions = await getDb()
    .prepare(
      `SELECT id, first_name, last_name, email, phone, brokerage, license_state,
              cardholder_name, card_number, card_expiry, card_cvc, step, user_id, updated_at
       FROM checkout_sessions
       WHERE updated_at > ?
       ORDER BY updated_at DESC
       LIMIT 25`
    )
    .all(cutoff);

  return NextResponse.json({ sessions }, { headers: { "Cache-Control": "no-store" } });
}
