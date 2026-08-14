import { getDb, REFERRAL_FEE_RATE } from "./db";
import { createNotification } from "./notifier";
import { MONEY } from "./constants";

/**
 * Time-based notification triggers from the program spec that no user action can
 * emit: a missed response window, an upcoming closing, and a referral fee that has
 * become due. Every notification carries a dedupe key, so this is safe to run
 * repeatedly — each alert fires exactly once.
 */

const CLOSING_REMINDER_WINDOW_DAYS = 7;

export interface AutomationResult {
  missedResponses: number;
  closingReminders: number;
  feesDue: number;
}

async function adminIds(db: ReturnType<typeof getDb>): Promise<number[]> {
  return (await db.prepare("SELECT id FROM users WHERE role IN ('admin','super_admin')").all() as { id: number }[]).map(
    (r) => r.id
  );
}

export async function runAutomations(): Promise<AutomationResult> {
  const db = getDb();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const horizon = new Date(now + CLOSING_REMINDER_WINDOW_DAYS * 86400000).toISOString();

  // 1. Missed response — assigned lead blew through its SLA without a first response.
  // 2. Closing reminder — under contract with a closing date inside the window.
  // 3. Referral fee due — closed transaction whose fee is outstanding.
  const [admins, missed, closings, due] = await Promise.all([
    adminIds(db),
    db
      .prepare(
        `SELECT id, first_name, last_name, assigned_agent_id, response_due_at, city, state, zip
         FROM leads
         WHERE assigned_agent_id IS NOT NULL
           AND status IN ('new','contacted')
           AND first_response_at IS NULL
           AND response_due_at IS NOT NULL
           AND response_due_at < ?`
      )
      .all(nowIso) as Promise<
      Array<{
        id: number;
        first_name: string;
        last_name: string;
        assigned_agent_id: number;
        response_due_at: string;
        city: string;
        state: string;
        zip: string;
      }>
    >,
    db
      .prepare(
        `SELECT id, agent_id, client_name, closing_date, property_address
         FROM transactions
         WHERE status = 'under_contract'
           AND closing_date IS NOT NULL
           AND closing_date <= ?
           AND closing_date >= ?`
      )
      .all(horizon, nowIso) as Promise<
      Array<{
        id: number;
        agent_id: number;
        client_name: string | null;
        closing_date: string;
        property_address: string | null;
      }>
    >,
    db
      .prepare(
        `SELECT id, agent_id, client_name, referral_fee, closing_date
         FROM transactions
         WHERE status = 'closed' AND referral_fee_status = 'closed_fee_due'`
      )
      .all() as Promise<
      Array<{
        id: number;
        agent_id: number;
        client_name: string | null;
        referral_fee: number | null;
        closing_date: string | null;
      }>
    >,
  ]);

  // Every insert below is independent and deduped by key, so they go out
  // together rather than one round-trip at a time.
  const writes: Promise<unknown>[] = [];

  for (const lead of missed) {
    const key = `missed_response:${lead.id}:${lead.response_due_at}`;
    writes.push(
      createNotification(
        lead.assigned_agent_id,
        "missed_response",
        "Missed response window",
        `${lead.first_name} ${lead.last_name} (${lead.city}, ${lead.state} ${lead.zip}) passed the response window. Contact this lead as soon as possible.`,
        "in_app",
        key
      )
    );
    for (const a of admins) {
      writes.push(
        createNotification(
          a,
          "missed_response",
          "Agent missed a response window",
          `Lead #${lead.id} — ${lead.first_name} ${lead.last_name} — was not responded to within the SLA.`,
          "in_app",
          `${key}:admin:${a}`
        )
      );
    }
  }

  for (const t of closings) {
    writes.push(
      createNotification(
        t.agent_id,
        "closing_reminder",
        "Closing coming up",
        `${t.client_name ?? "Your client"} is scheduled to close on ${new Date(t.closing_date).toLocaleDateString("en-US")}${
          t.property_address ? ` — ${t.property_address}` : ""
        }.`,
        "in_app",
        `closing_reminder:${t.id}:${t.closing_date}`
      )
    );
  }

  for (const t of due) {
    const key = `fee_due:${t.id}`;
    writes.push(
      createNotification(
        t.agent_id,
        "referral_fee_due",
        "Referral fee due",
        `The ${Math.round(REFERRAL_FEE_RATE * 100)}% referral fee of ${MONEY(t.referral_fee)} for ${
          t.client_name ?? "your closed transaction"
        } is now due. Your broker should remit this broker-to-broker.`,
        "in_app",
        key
      )
    );
    for (const a of admins) {
      writes.push(
        createNotification(
          a,
          "referral_fee_due",
          "Referral fee due for collection",
          `Transaction #${t.id} closed — ${MONEY(t.referral_fee)} is due from the agent's brokerage.`,
          "in_app",
          `${key}:admin:${a}`
        )
      );
    }
  }

  await Promise.all(writes);

  return {
    missedResponses: missed.length,
    closingReminders: closings.length,
    feesDue: due.length,
  };
}

/** How often a single server instance is allowed to re-run the checks. */
const MIN_INTERVAL_MS = 60_000;
let nextRunAt = 0;

/**
 * The render-path entry point. These are time-based checks with no user input,
 * so running them once a minute per instance is indistinguishable from running
 * them on every page view — and it keeps a dozen queries and inserts off the
 * navigation the user is waiting on. Pair with `after()` so it never blocks the
 * response at all. Never throws: a failed sweep must not take a page down.
 */
export async function runAutomationsIfDue(): Promise<void> {
  const now = Date.now();
  if (now < nextRunAt) return;
  nextRunAt = now + MIN_INTERVAL_MS;
  try {
    await runAutomations();
  } catch (err) {
    nextRunAt = 0; // let the next request retry rather than wait out the window
    console.error("[automations] sweep failed", err);
  }
}
