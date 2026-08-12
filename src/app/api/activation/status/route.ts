import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { activationDestination } from "@/lib/activation";

export const dynamic = "force-dynamic";

/**
 * Polled by every applicant-facing activation page. Returns the current stage
 * and the route it belongs on, so the browser can follow the admin's decision.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "agent") {
    return NextResponse.json({ stage: "unauthenticated", destination: "/login" }, { status: 401 });
  }

  const row = (await getDb()
    .prepare("SELECT activation_stage FROM users WHERE id = ?")
    .get(user.id)) as { activation_stage: string | null } | undefined;

  const stage = row?.activation_stage ?? "approved";
  return NextResponse.json(
    { stage, destination: activationDestination(stage) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
