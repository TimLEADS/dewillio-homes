import { getDb } from "./db";
import type { NotificationChannel } from "./types";

/**
 * Creates a notification. When `dedupeKey` is supplied the insert is a no-op if a
 * notification with that key already exists — this is what lets the automated
 * checks (missed response, closing reminder, fee due) run on every request
 * without ever sending the same alert twice.
 */
export function createNotification(
  userId: number | null,
  type: string,
  title: string,
  body: string,
  channel: NotificationChannel = "in_app",
  dedupeKey?: string
): number {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT OR IGNORE INTO notifications (user_id, type, title, body, channel, sent_at, read_at, dedupe_key)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`
    )
    .run(userId, type, title, body, channel, new Date().toISOString(), dedupeKey ?? null);
  return Number(result.lastInsertRowid);
}

/** Returns true when the notification was newly created (not deduped away). */
export function createNotificationOnce(
  userId: number | null,
  type: string,
  title: string,
  body: string,
  dedupeKey: string,
  channel: NotificationChannel = "in_app"
): boolean {
  const db = getDb();
  const before = db.prepare("SELECT COUNT(*) AS c FROM notifications").get() as { c: number };
  createNotification(userId, type, title, body, channel, dedupeKey);
  const after = db.prepare("SELECT COUNT(*) AS c FROM notifications").get() as { c: number };
  return after.c > before.c;
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
  createNotification(userId, type, title, body, "in_app", dedupeKey);

  const prefs = db
    .prepare("SELECT notify_email, notify_sms FROM user_settings WHERE user_id = ?")
    .get(userId) as { notify_email: number; notify_sms: number } | undefined;
  const wantsEmail = prefs?.notify_email ?? 1;
  const wantsSms = prefs?.notify_sms ?? 1;

  if (wantsEmail && email) {
    createNotification(userId, type, title, body, "email", dedupeKey ? dedupeKey + ":email" : undefined);
    void sendEmail(email, title, body);
  }
  if (wantsSms && phone) {
    createNotification(userId, type, title, body, "sms", dedupeKey ? dedupeKey + ":sms" : undefined);
    void sendSms(phone, body);
  }
}
