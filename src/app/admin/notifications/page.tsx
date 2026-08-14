import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/lib/actions/admin";
import { Card, Container } from "@/components/ui";
import { DATETIME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  await requireAdmin();
  const db = getDb();
  const rows = await db
    .prepare(
      `SELECT n.*, u.email
       FROM notifications n LEFT JOIN users u ON u.id = n.user_id
       ORDER BY n.sent_at DESC LIMIT 100`
    )
    .all() as Array<Record<string, unknown>>;

  return (
    <Container className="!px-0">
      <h1 className="font-serif text-2xl font-bold text-brand-950">Notifications</h1>
      <p className="mt-1 text-sm text-brand-500">
        Platform notifications, including new activations and verification updates.
      </p>

      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-brand-950">Outbox</h2>
          <form action={markAllNotificationsReadAction}>
            <button type="submit" className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">
              Mark all mine read
            </button>
          </form>
        </div>
        <div className="space-y-2">
          {rows.length === 0 ? (
            <p className="text-sm text-brand-500">No notifications yet.</p>
          ) : (
            rows.map((n) => (
              <div key={n.id as number} className={`rounded-xl border p-4 ${n.read_at ? "border-brand-100" : "border-accent-300 bg-accent-50/40"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-brand-950">{n.title as string}</p>
                    <p className="mt-0.5 text-sm text-brand-600">{n.body as string}</p>
                    <p className="mt-1 text-xs text-brand-400">
                      To: {n.email as string ?? "—"} · {n.channel as string} · {DATETIME(n.sent_at as string)}
                      {n.read_at ? ` · Read ${DATETIME(n.read_at as string)}` : " · Unread"}
                    </p>
                  </div>
                  {!n.read_at ? (
                    <form action={markNotificationReadAction}>
                      <input type="hidden" name="id" value={n.id as number} />
                      <button type="submit" className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">
                        Mark read
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </Container>
  );
}
