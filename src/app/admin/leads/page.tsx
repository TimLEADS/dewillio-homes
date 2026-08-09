import Link from "next/link";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Badge, Card, Container } from "@/components/ui";
import { DATE, isMissed, LEAD_STATUS_COLORS, LEAD_STATUS_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  await requireAdmin();
  const db = getDb();
  const leads = db
    .prepare(
      `SELECT l.*, p.first_name AS agent_first, p.last_name AS agent_last
       FROM leads l LEFT JOIN users u ON u.id = l.assigned_agent_id
       LEFT JOIN agent_profiles p ON p.user_id = u.id
       ORDER BY l.created_at DESC`
    )
    .all() as Array<Record<string, unknown>>;

  return (
    <Container className="!px-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-brand-950">Leads</h1>
          <p className="mt-1 text-sm text-brand-500">All leads, assignments and statuses.</p>
        </div>
        <Link
          href="/admin/leads/new"
          className="rounded-lg bg-brand-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
        >
          + New Lead
        </Link>
      </div>

      <Card className="mt-6 !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-xs uppercase tracking-wider text-brand-400">
                <th className="px-5 py-3">Lead</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Assigned Agent</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Received</th>
                <th className="px-5 py-3">SLA</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => {
                const missed = isMissed(l as { status: string; response_due_at: string | null });
                return (
                  <tr key={l.id as number} className="border-b border-brand-50 hover:bg-brand-50/40">
                    <td className="px-5 py-3">
                      <Link href={`/admin/leads/${l.id}`} className="font-semibold text-brand-950 hover:underline">
                        {l.first_name as string} {l.last_name as string}
                      </Link>
                      <p className="text-xs text-brand-500">{l.email as string}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Badge className="bg-brand-100 text-brand-700 ring-brand-600/20">{l.lead_type as string}</Badge>
                    </td>
                    <td className="px-5 py-3 text-brand-700">
                      {l.city as string}, {l.state as string} {l.zip as string}
                    </td>
                    <td className="px-5 py-3 text-brand-700">
                      {l.agent_first ? `${l.agent_first} ${l.agent_last}` : <span className="text-brand-400">Unassigned</span>}
                    </td>
                    <td className="px-5 py-3">
                      <Badge className={LEAD_STATUS_COLORS[l.status as string]}>{LEAD_STATUS_LABELS[l.status as string]}</Badge>
                    </td>
                    <td className="px-5 py-3 text-brand-500">{DATE(l.created_at as string)}</td>
                    <td className="px-5 py-3">
                      {missed ? (
                        <Badge className="bg-rose-100 text-rose-800 ring-rose-600/20">Missed</Badge>
                      ) : l.response_due_at ? (
                        <span className="text-xs text-brand-500">{DATE(l.response_due_at as string)}</span>
                      ) : (
                        <span className="text-xs text-brand-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </Container>
  );
}
