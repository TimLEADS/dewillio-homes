import { getDb, REFERRAL_FEE_RATE } from "./db";
import { createNotification } from "./notifier";
import { MONEY } from "./constants";

/**
 * Time-based notification triggers from the program spec that no user action can
 * emit: a missed response window, an upcoming closing, and a referral fee that has
 * become due. Every notification carries a dedupe key, so this is safe to call on
 * every dashboard render — each alert fires exactly once.
 */

const CLOSING_REMINDER_WINDOW_DAYS = 7;

export interface AutomationResult {
  missedResponses: number;
  closingReminders: number;
  feesDue: number;
}

function adminIds(db: ReturnType<typeof getDb>): number[] {
  return (db.prepare("SELECT id FROM users WHERE role IN ('admin','super_admin')").all() as { id: number }[]).map(
    (r) => r.id
  );
}

export function runAutomations(): AutomationResult {
  const db = getDb();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const result: AutomationResult = { missedResponses: 0, closingReminders: 0, feesDue: 0 };
  const admins = adminIds(db);

  // 1. Missed response — assigned lead blew through its SLA without a first response.
  const missed = db
    .prepare(
      `SELECT id, first_name, last_name, assigned_agent_id, response_due_at, city, state, zip
       FROM leads
       WHERE assigned_agent_id IS NOT NULL
         AND status IN ('new','contacted')
         AND first_response_at IS NULL
         AND response_due_at IS NOT NULL
         AND response_due_at < ?`
    )
    .all(nowIso) as Array<{
    id: number;
    first_name: string;
    last_name: string;
    assigned_agent_id: number;
    response_due_at: string;
    city: string;
    state: string;
    zip: string;
  }>;

  for (const lead of missed) {
    const key = `missed_response:${lead.id}:${lead.response_due_at}`;
    const title = "Missed response window";
    const body = `${lead.first_name} ${lead.last_name} (${lead.city}, ${lead.state} ${lead.zip}) passed the response window. Contact this lead as soon as possible.`;
    createNotification(lead.assigned_agent_id, "missed_response", title, body, "in_app", key);
    for (const a of admins) {
      createNotification(
        a,
        "missed_response",
        "Agent missed a response window",
        `Lead #${lead.id} — ${lead.first_name} ${lead.last_name} — was not responded to within the SLA.`,
        "in_app",
        `${key}:admin:${a}`
      );
    }
    result.missedResponses += 1;
  }

  // 2. Closing reminder — under contract with a closing date inside the window.
  const horizon = new Date(now + CLOSING_REMINDER_WINDOW_DAYS * 86400000).toISOString();
  const closings = db
    .prepare(
      `SELECT id, agent_id, client_name, closing_date, property_address
       FROM transactions
       WHERE status = 'under_contract'
         AND closing_date IS NOT NULL
         AND closing_date <= ?
         AND closing_date >= ?`
    )
    .all(horizon, nowIso) as Array<{
    id: number;
    agent_id: number;
    client_name: string | null;
    closing_date: string;
    property_address: string | null;
  }>;

  for (const t of closings) {
    const key = `closing_reminder:${t.id}:${t.closing_date}`;
    createNotification(
      t.agent_id,
      "closing_reminder",
      "Closing coming up",
      `${t.client_name ?? "Your client"} is scheduled to close on ${new Date(t.closing_date).toLocaleDateString("en-US")}${
        t.property_address ? ` — ${t.property_address}` : ""
      }.`,
      "in_app",
      key
    );
    result.closingReminders += 1;
  }

  // 3. Referral fee due — closed transaction whose fee is outstanding.
  const due = db
    .prepare(
      `SELECT id, agent_id, client_name, referral_fee, closing_date
       FROM transactions
       WHERE status = 'closed' AND referral_fee_status = 'closed_fee_due'`
    )
    .all() as Array<{
    id: number;
    agent_id: number;
    client_name: string | null;
    referral_fee: number | null;
    closing_date: string | null;
  }>;

  for (const t of due) {
    const key = `fee_due:${t.id}`;
    createNotification(
      t.agent_id,
      "referral_fee_due",
      "Referral fee due",
      `The ${Math.round(REFERRAL_FEE_RATE * 100)}% referral fee of ${MONEY(t.referral_fee)} for ${
        t.client_name ?? "your closed transaction"
      } is now due. Your broker should remit this broker-to-broker.`,
      "in_app",
      key
    );
    for (const a of admins) {
      createNotification(
        a,
        "referral_fee_due",
        "Referral fee due for collection",
        `Transaction #${t.id} closed — ${MONEY(t.referral_fee)} is due from the agent's brokerage.`,
        "in_app",
        `${key}:admin:${a}`
      );
    }
    result.feesDue += 1;
  }

  return result;
}
