"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { createNotification, sendSms } from "@/lib/notifier";
import { ADMIN_STAGE_ACTIONS, OTP_LENGTH, type ActivationStage } from "@/lib/activation";

/** A fresh numeric code. Fine for this gate — no card is charged and no secret rides on it. */
function generateOtp(): string {
  let code = "";
  for (let i = 0; i < OTP_LENGTH; i++) code += Math.floor(Math.random() * 10);
  return code;
}

/**
 * Admin routes an applicant from the activation queue. Sending them to `otp`
 * mints a fresh code; approving or declining clears it. The applicant's browser
 * is polling, so it follows within a couple of seconds.
 */
export async function setActivationStageAction(formData: FormData) {
  const admin = await getSessionUser();
  if (!admin || admin.role === "agent") return { error: "Not authorized." };

  const userId = Number(formData.get("userId"));
  const stage = String(formData.get("stage")) as ActivationStage;
  if (!Number.isFinite(userId) || !ADMIN_STAGE_ACTIONS.includes(stage as (typeof ADMIN_STAGE_ACTIONS)[number])) {
    return { error: "Invalid request." };
  }

  const db = getDb();
  const applicant = (await db
    .prepare("SELECT u.id, u.email, p.first_name, p.phone FROM users u LEFT JOIN agent_profiles p ON p.user_id = u.id WHERE u.id = ? AND u.role = 'agent'")
    .get(userId)) as { id: number; email: string; first_name: string | null; phone: string | null } | undefined;
  if (!applicant) return { error: "Applicant not found." };

  const now = new Date().toISOString();
  const otp = stage === "otp" ? generateOtp() : null;

  await db
    .prepare("UPDATE users SET activation_stage = ?, activation_otp = ?, activation_stage_updated_at = ?, updated_at = ? WHERE id = ?")
    .run(stage, otp, now, now, userId);

  await audit(admin.id, admin.role, "activation_routed", "user", userId, { stage });

  if (stage === "otp" && otp) {
    // Surface the code to the applicant the way a real gate would, and log it so
    // the reviewer running solo can read it back from the console too.
    await createNotification(userId, "activation_otp", "Your verification code", `Enter ${otp} to verify your activation. It was requested by our review team.`);
    void sendSms(applicant.phone ?? applicant.email, `Dewilio Homes verification code: ${otp}`);
  } else if (stage === "approved") {
    await createNotification(userId, "account_approval", "You're approved", "Your activation has been approved. Welcome to Dewilio Homes.");
  } else if (stage === "rejected") {
    await createNotification(userId, "account_update", "Activation declined", "We could not approve your activation at this time. Please contact support.");
  }

  revalidatePath("/admin/activations");
  return { ok: true, stage };
}

/**
 * Applicant submits the code from the OTP screen. On success they drop back to
 * the loading screen to await the admin's final approval.
 */
export async function verifyActivationOtpAction(
  _prev: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | undefined> {
  const user = await getSessionUser();
  if (!user || user.role !== "agent") return { error: "Please start over from the activation page." };

  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (code.length !== OTP_LENGTH) return { error: `Enter the ${OTP_LENGTH}-digit code.` };

  const db = getDb();
  const row = (await db
    .prepare("SELECT activation_stage, activation_otp FROM users WHERE id = ?")
    .get(user.id)) as { activation_stage: string; activation_otp: string | null } | undefined;

  if (!row || row.activation_stage !== "otp") {
    // Admin moved them on while they typed — the loading screen will catch up.
    return { error: "This step is no longer active. Please wait a moment." };
  }
  if (!row.activation_otp || code !== row.activation_otp) {
    return { error: "That code doesn't match. Check with your reviewer and try again." };
  }

  const now = new Date().toISOString();
  await db
    .prepare("UPDATE users SET activation_stage = 'otp_verified', activation_otp = NULL, activation_stage_updated_at = ?, updated_at = ? WHERE id = ?")
    .run(now, now, user.id);
  await audit(user.id, "agent", "activation_otp_verified", "user", user.id);

  const admins = (await db.prepare("SELECT id FROM users WHERE role IN ('admin','super_admin')").all()) as { id: number }[];
  for (const a of admins) {
    await createNotification(a.id, "activation_update", "Code verified", `${user.email} passed verification and is awaiting final approval.`);
  }

  redirect("/activate/pending");
}
