import Link from "next/link";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Badge, Card, Container, StatCard } from "@/components/ui";
import { DATETIME } from "@/lib/constants";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-amber-100 text-amber-800 ring-amber-600/20",
  completed: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  rescheduled: "bg-sky-100 text-sky-800 ring-sky-600/20",
  cancelled: "bg-rose-100 text-rose-800 ring-rose-600/20",
};

export default async function AdminAppointmentsPage() {
  await requireAdmin();
  const db = getDb();

  const rows = db
    .prepare(
      `SELECT a.id, a.scheduled_at, a.type, a.notes, a.status, a.created_at,
              l.id AS lead_id, l.first_name AS lead_first, l.last_name AS lead_last,
              l.city, l.state, l.zip, l.lead_type,
              u.id AS agent_id, u.email AS agent_email,
              p.first_name AS agent_first, p.last_name AS agent_last
       FROM appointments a
       JOIN leads l ON l.id = a.lead_id
       JOIN users u ON u.id = a.agent_id
       LEFT JOIN agent_profiles p ON p.user_id = u.id
       ORDER BY a.scheduled_at DESC
       LIMIT 300`
    )
    .all() as Array<Record<string, unknown>>;

  const counts = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(CASE WHEN status IN ('scheduled','rescheduled') THEN 1 ELSE 0 END), 0) AS upcoming,
         COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completed,
         COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled
       FROM appointments`
    )
    .get() as { total: number; upcoming: number; completed: number; cancelled: number };

  return (
    <Container className="!px-0">
      <h1 className="font-serif text-2xl font-bold text-brand-950">Appointments</h1>
      <p className="mt-1 text-sm text-brand-500">
        Every call, showing and meeting booked by an agent against a referred lead.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={counts.total} />
        <StatCard label="Upcoming" value={counts.upcoming} sub="Scheduled or rescheduled" />
        <StatCard label="Completed" value={counts.completed} />
        <StatCard label="Cancelled" value={counts.cancelled} />
      </div>

      <Card className="mt-6 !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-xs uppercase tracking-wider text-brand-400">
                <th className="px-5 py-3">When</th>
                <th className="px-5 py-3">Lead</th>
                <th className="px-5 py-3">Agent</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-sm text-brand-500">
                    No appointments booked yet.
                  </td>
                </tr>
              ) : (
                rows.map((a) => (
                  <tr key={a.id as number} className="border-b border-brand-50 hover:bg-brand-50/40">
                    <td className="whitespace-nowrap px-5 py-3 text-brand-700">
                      {DATETIME(a.scheduled_at as string)}
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/leads/${a.lead_id}`}
                        className="font-semibold text-brand-950 hover:underline"
                      >
                        {a.lead_first as string} {a.lead_last as string}
                      </Link>
                      <p className="text-xs text-brand-500">
                        {a.lead_type as string} · {a.city as string}, {a.state as string} {a.zip as string}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/agents/${a.agent_id}`}
                        className="font-medium text-brand-900 hover:underline"
                      >
                        {String(a.agent_first ?? "Agent")} {String(a.agent_last ?? "")}
                      </Link>
                      <p className="text-xs text-brand-500">{a.agent_email as string}</p>
                    </td>
                    <td className="px-5 py-3 text-brand-700">{a.type as string}</td>
                    <td className="px-5 py-3">
                      <Badge className={STATUS_STYLE[a.status as string] ?? "bg-brand-100 text-brand-700 ring-brand-600/20"}>
                        {a.status as string}
                      </Badge>
                    </td>
                    <td className="max-w-xs px-5 py-3 text-xs text-brand-500">
                      {(a.notes as string) || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </Container>
  );
}
