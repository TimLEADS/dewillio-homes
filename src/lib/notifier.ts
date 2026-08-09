import { getDb } from "./db";
import type { NotificationChannel } from "./types";

/**
 * Creates a notification. When `dedupeKey` is supplied the insert is a no-op if a
 * notification with that key already exists — this is what lets the automated
 * checks (missed response, closing reminder, fee due) run on every request
 * without ever sending the same alert twice.
 */
export async function createNotification(
  userId: number | null,
  type: string,
  title: string,
  body: string,
  channel: NotificationChannel = "in_app",
  dedupeKey?: string
): Promise<number | null> {
  const db = getDb();
  const row = (await db
    .prepare(
      `INSERT INTO notifications (user_id, type, title, body, channel, sent_at, read_at, dedupe_key)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?)
       ON CONFLICT DO NOTHING
       RETURNING id`
    )
    .get(userId, type, title, body, channel, new Date().toISOString(), dedupeKey ?? null)) as
    | { id: number }
    | undefined;
  return row?.id ?? null;
}

/** Returns true when the notification was newly created (not deduped away). */
export async function createNotificationOnce(
  userId: number | null,
  type: string,
  title: string,
  body: string,
  dedupeKey: string,
  channel: NotificationChannel = "in_app"
): Promise<boolean> {
  return (await createNotification(userId, type, title, body, channel, dedupeKey)) !== null;
}

export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  console.log(`[email → ${to}] ${subject}: ${body}`);
}

export async function sendSms(to: string, body: string): Promise<void> {
  console.log(`[sms → ${to}] ${body}`);
}

/**
 * Fans a single event out to the in-app inbox plus the email/SMS transports,
 * honouring the agent's per-channel preferences in `user_settings`.
 */
export async function notifyEmailSms(
  userId: number,
  email: string,
  phone: string | null,
  type: string,
  title: string,
  body: string,
  dedupeKey?: string
): Promise<void> {
  const db = getDb();
  await createNotification(userId, type, title, body, "in_app", dedupeKey);

  const prefs = await db
    .prepare("SELECT notify_email, notify_sms FROM user_settings WHERE user_id = ?")
    .get(userId) as { notify_email: number; notify_sms: number } | undefined;
  const wantsEmail = prefs?.notify_email ?? 1;
  const wantsSms = prefs?.notify_sms ?? 1;

  if (wantsEmail && email) {
    await createNotification(userId, type, title, body, "email", dedupeKey ? dedupeKey + ":email" : undefined);
    void sendEmail(email, title, body);
  }
  if (wantsSms && phone) {
    await createNotification(userId, type, title, body, "sms", dedupeKey ? dedupeKey + ":sms" : undefined);
    void sendSms(phone, body);
  }
}
