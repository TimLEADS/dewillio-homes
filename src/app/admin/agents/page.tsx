import Link from "next/link";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Badge, Card, Container } from "@/components/ui";
import { DATE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminAgentsPage() {
  await requireAdmin();
  const db = getDb();
  const agents = await db
    .prepare(
      `SELECT u.id, u.email, u.status, u.activated, u.license_verified, u.market_approved, u.created_at,
              p.first_name, p.last_name, p.primary_city, p.state, p.brokerage, p.license_state,
              (SELECT COUNT(*) FROM leads l WHERE l.assigned_agent_id = u.id AND l.status NOT IN ('closed','lost')) AS active_leads
       FROM users u LEFT JOIN agent_profiles p ON p.user_id = u.id
       WHERE u.role = 'agent'
       ORDER BY u.created_at DESC`
    )
    .all() as Array<Record<string, unknown>>;

  const statusStyle: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 ring-amber-600/20",
    active: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
    suspended: "bg-rose-100 text-rose-800 ring-rose-600/20",
  };

  return (
    <Container className="!px-0">
      <h1 className="font-serif text-2xl font-bold text-brand-950">Agents</h1>
      <p className="mt-1 text-sm text-brand-500">Approve, verify licenses, and monitor every participating agent.</p>

      <Card className="mt-6 !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-xs uppercase tracking-wider text-brand-400">
                <th className="px-5 py-3">Agent</th>
                <th className="px-5 py-3">Market</th>
                <th className="px-5 py-3">License</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Verified</th>
                <th className="px-5 py-3">Active Leads</th>
                <th className="px-5 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id as number} className="border-b border-brand-50 hover:bg-brand-50/40">
                  <td className="px-5 py-3">
                    <Link href={`/admin/agents/${a.id}`} className="font-semibold text-brand-950 hover:underline">
                      {String(a.first_name ?? "Unknown")} {String(a.last_name ?? "")}
                    </Link>
                    <p className="text-xs text-brand-500">{a.email as string}</p>
                  </td>
                  <td className="px-5 py-3 text-brand-700">
                    {a.primary_city ? `${a.primary_city}, ${a.state}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-brand-700">{a.license_state as string ?? "—"}</td>
                  <td className="px-5 py-3">
                    <Badge className={statusStyle[a.status as string] ?? "bg-brand-100 text-brand-700 ring-brand-600/20"}>
                      {a.status as string}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    {a.license_verified === 1 && a.market_approved === 1 ? (
                      <Badge className="bg-emerald-100 text-emerald-800 ring-emerald-600/20">Approved</Badge>
                    ) : (
                      <Badge className="bg-brand-100 text-brand-700 ring-brand-600/20">Pending</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3 text-brand-700">{a.active_leads as number}</td>
                  <td className="px-5 py-3 text-brand-500">{DATE(a.created_at as string)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Container>
  );
}
