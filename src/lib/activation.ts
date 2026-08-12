/**
 * The activation gate an applicant passes through after paying the $1 fee.
 *
 * A new signup lands on `waiting` and the browser holds on a live loading
 * screen. An admin, watching the queue at /admin/activations, chooses where to
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
  | "approved" // admin approved; applicant sees the welcome screen
  | "rejected"; // admin declined

export const OTP_LENGTH = 6;

/** The stages an admin can move an applicant into from the queue. */
export const ADMIN_STAGE_ACTIONS = ["otp", "approved", "rejected", "waiting"] as const;

/** Stages still awaiting an admin, i.e. what the activation queue should list. */
export const OPEN_STAGES: ActivationStage[] = ["waiting", "otp", "otp_verified"];

/** The route each stage belongs on. Applicant pages redirect here to stay in sync. */
export function activationDestination(stage: string): string {
  switch (stage) {
    case "otp":
      return "/activate/otp";
    case "approved":
      return "/activate/approved";
    case "waiting":
    case "otp_verified":
    case "rejected":
    default:
      return "/activate/pending";
  }
}

const LABELS: Record<string, string> = {
  waiting: "Awaiting review",
  otp: "Code sent",
  otp_verified: "Code verified",
  approved: "Approved",
  rejected: "Declined",
};

export function stageLabel(stage: string): string {
  return LABELS[stage] ?? stage;
}
