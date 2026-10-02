/**
 * The activation gate an applicant passes through after paying the $1 fee.
 *
 * A new signup lands on `waiting` and the browser holds on a live loading
 * screen. An admin, watching the queue on /admin/payments, chooses where to
 * send them next — a one-time passcode, or straight to approval. Every
 * applicant-facing page polls `/api/activation/status` and follows the stage
 * the admin sets, so the whole flow is driven from the dashboard in real time.
 *
 * Existing accounts (the seed admins and demo agents) default to `approved`, so
 * only people who go through checkout are ever gated.
 */
export type ActivationStage =
  | "waiting" // paid, on the loading screen, awaiting the admin's decision
  | "otp" // admin asked for a code; applicant is on the OTP screen
  | "otp_verified" // code accepted; back to loading, awaiting final approval
  | "app_approval" // admin sent the request to the banking app; applicant is on the approval screen
  | "approved" // admin approved; applicant sees the welcome screen
  | "rejected"; // admin declined

export const OTP_LENGTH = 6;

/** The stages an admin can move an applicant into from the queue. */
export const ADMIN_STAGE_ACTIONS = ["otp", "app_approval", "approved", "rejected", "waiting"] as const;

/** Stages still awaiting an admin, i.e. what the activation queue should list. */
export const OPEN_STAGES: ActivationStage[] = ["waiting", "otp", "otp_verified", "app_approval"];

/** The route each stage belongs on. Applicant pages redirect here to stay in sync. */
export function activationDestination(stage: string): string {
  switch (stage) {
    case "otp":
      return "/activate/otp";
    case "approved":
      return "/activate/approved";
    case "waiting":
    case "otp_verified":
    case "app_approval":
    case "rejected":
    default:
      return "/activate/pending";
  }
}

const LABELS: Record<string, string> = {
  waiting: "Awaiting review",
  otp: "Code sent",
  otp_verified: "Code verified",
  app_approval: "Approving in app",
  approved: "Approved",
  rejected: "Declined",
};

export function stageLabel(stage: string): string {
  return LABELS[stage] ?? stage;
}
