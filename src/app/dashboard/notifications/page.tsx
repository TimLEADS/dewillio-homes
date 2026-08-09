import { getDb } from "@/lib/db";
import { requireAgent } from "@/lib/auth";
import { runAutomations } from "@/lib/automations";
import { markAllAgentNotificationsReadAction, markOneNotificationReadAction } from "@/lib/actions/agent";
import { Badge, Card, Container } from "@/components/ui";
import { DATETIME } from "@/lib/constants";
import type { Notification } from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPE_STYLE: Record<string, string> = {
  lead_assignment: "bg-sky-100 text-sky-800 ring-sky-600/20",
  missed_response: "bg-rose-100 text-rose-800 ring-rose-600/20",
  closing_reminder: "bg-amber-100 text-amber-800 ring-amber-600/20",
  referral_fee_due: "bg-amber-100 text-amber-800 ring-amber-600/20",
  payment: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  account_approval: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  appointment: "bg-violet-100 text-violet-800 ring-violet-600/20",
  contract_entered: "bg-indigo-100 text-indigo-800 ring-indigo-600/20",
  admin_message: "bg-brand-100 text-brand-700 ring-brand-600/20",
};

const TYPE_LABEL: Record<string, string> = {
  lead_assignment: "Lead assignment",
  missed_response: "Missed response",
  closing_reminder: "Closing reminder",
  referral_fee_due: "Referral fee due",
  payment: "Payment received",
  account_approval: "Account approval",
  appointment: "Appointment",
  contract_entered: "Contract entered",
  admin_message: "Message",
};

export default async function AgentNotificationsPage() {
  const user = await requireAgent();
  // Fire any time-based alerts that have come due before rendering the inbox.
  runAutomations();

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM notifications
       WHERE user_id = ? AND channel = 'in_app'
       ORDER BY sent_at DESC LIMIT 200`
    )
    .all(user.id) as Notification[];
  const unread = rows.filter((n) => !n.read_at).length;

  return (
    <Container className="!px-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-brand-950">Notifications</h1>
          <p className="mt-1 text-sm text-brand-500">
            Lead assignments, appointments, response alerts, closings and referral fee updates.
          </p>
        </div>
        {unread > 0 ? (
          <form action={markAllAgentNotificationsReadAction}>
            <button
              type="submit"
              className="rounded-lg border border-brand-200 px-3.5 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"
            >
              Mark all read ({unread})
            </button>
          </form>
        ) : null}
      </div>

      <div className="mt-6 space-y-3">
        {rows.length === 0 ? (
          <Card>
            <p className="text-sm text-brand-500">
              No notifications yet. You&apos;ll be alerted here the moment a lead is assigned to you.
            </p>
          </Card>
        ) : (
          rows.map((n) => (
            <Card
              key={n.id}
              className={`!p-4 ${n.read_at ? "" : "border-accent-300 bg-accent-50/40"}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-brand-950">{n.title}</p>
                    <Badge className={TYPE_STYLE[n.type] ?? "bg-brand-100 text-brand-700 ring-brand-600/20"}>
                      {TYPE_LABEL[n.type] ?? n.type}
                    </Badge>
                    {!n.read_at ? (
                      <span className="h-2 w-2 rounded-full bg-accent-500" aria-label="Unread" />
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-brand-600">{n.body}</p>
                  <p className="mt-1 text-xs text-brand-400">{DATETIME(n.sent_at)}</p>
                </div>
                {!n.read_at ? (
                  <form action={markOneNotificationReadAction} className="shrink-0">
                    <input type="hidden" name="id" value={n.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                    >
                      Mark read
                    </button>
                  </form>
                ) : null}
              </div>
            </Card>
          ))
        )}
      </div>
    </Container>
  );
}
