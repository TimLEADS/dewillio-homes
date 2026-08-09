import Link from "next/link";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Badge, Card, Container, StatCard } from "@/components/ui";
import { MONEY } from "@/lib/constants";

export const dynamic = "force-dynamic";

const EXPORTS = [
  { type: "leads", label: "Leads CSV" },
  { type: "agents", label: "Agents CSV" },
  { type: "transactions", label: "Transactions CSV" },
  { type: "referral-fees", label: "Referral Fees CSV" },
  { type: "payments", label: "Activation Payments CSV" },
  { type: "appointments", label: "Appointments CSV" },
  { type: "audit", label: "Audit Log CSV" },
];

export default async function AdminReportsPage() {
  await requireAdmin();
  const db = getDb();

  const totals = await db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN referral_fee_status = 'paid' THEN referral_fee ELSE 0 END), 0) AS paid,
         COALESCE(SUM(CASE WHEN referral_fee_status = 'closed_fee_due' THEN referral_fee ELSE 0 END), 0) AS due,
         COALESCE(SUM(CASE WHEN referral_fee_status = 'disputed' THEN referral_fee ELSE 0 END), 0) AS disputed,
         COALESCE(SUM(referral_fee), 0) AS total
       FROM transactions`
    )
    .get() as { paid: number; due: number; disputed: number; total: number };

  const activationRevenue = await db.prepare("SELECT COALESCE(SUM(amount), 0) AS s FROM activation_payments").get() as { s: number };

  const byAgent = await db
    .prepare(
      `SELECT p.first_name, p.last_name, u.email,
         COUNT(t.id) AS tx_count,
         COALESCE(SUM(CASE WHEN t.status = 'closed' THEN 1 ELSE 0 END), 0) AS closed_count,
         COALESCE(SUM(t.referral_fee), 0) AS fees,
         COALESCE(SUM(CASE WHEN t.referral_fee_status = 'paid' THEN t.referral_fee ELSE 0 END), 0) AS paid
       FROM users u
       LEFT JOIN agent_profiles p ON p.user_id = u.id
       LEFT JOIN transactions t ON t.agent_id = u.id
       WHERE u.role = 'agent'
       GROUP BY u.id
       ORDER BY fees DESC`
    )
    .all() as Array<Record<string, unknown>>;

  const byLeadSource = await db
    .prepare(`SELECT source, COUNT(*) AS c FROM leads GROUP BY source ORDER BY c DESC`)
    .all() as Array<Record<string, unknown>>;

  return (
    <Container className="!px-0">
      <h1 className="font-serif text-2xl font-bold text-brand-950">Reports</h1>
      <p className="mt-1 text-sm text-brand-500">Referral fee and platform revenue summaries.</p>

      <Card className="mt-6">
        <h2 className="mb-1 font-bold text-brand-950">Export</h2>
        <p className="mb-4 text-sm text-brand-500">
          Download any dataset as CSV for accounting, brokerage reconciliation or analysis.
        </p>
        <div className="flex flex-wrap gap-2">
          {EXPORTS.map((e) => (
            <Link
              key={e.type}
              href={`/admin/reports/export?type=${e.type}`}
              prefetch={false}
              className="rounded-lg border border-brand-200 px-3.5 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"
            >
              {e.label}
            </Link>
          ))}
        </div>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Referral Fees" value={MONEY(totals.total)} />
        <StatCard label="Fees Paid" value={MONEY(totals.paid)} />
        <StatCard label="Fees Due" value={MONEY(totals.due)} sub="Closed — fee due" />
        <StatCard label="Disputed" value={MONEY(totals.disputed)} />
      </div>
      <div className="mt-4">
        <StatCard label="Activation Revenue" value={MONEY(activationRevenue.s)} sub="From $1 activations" />
      </div>

      <Card className="mt-6 !p-0">
        <div className="px-5 py-4">
          <h2 className="font-bold text-brand-950">Fees by Agent</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-y border-brand-100 text-xs uppercase tracking-wider text-brand-400">
                <th className="px-5 py-3">Agent</th>
                <th className="px-5 py-3">Transactions</th>
                <th className="px-5 py-3">Closed</th>
                <th className="px-5 py-3">Referral Fees</th>
                <th className="px-5 py-3">Paid</th>
              </tr>
            </thead>
            <tbody>
              {byAgent.map((a) => (
                <tr key={a.email as string} className="border-b border-brand-50">
                  <td className="px-5 py-3">
                    <span className="font-semibold text-brand-950">{String(a.first_name)} {String(a.last_name)}</span>
                    <p className="text-xs text-brand-500">{a.email as string}</p>
                  </td>
                  <td className="px-5 py-3 text-brand-700">{a.tx_count as number}</td>
                  <td className="px-5 py-3 text-brand-700">{a.closed_count as number}</td>
                  <td className="px-5 py-3 font-semibold text-accent-700">{MONEY(a.fees as number)}</td>
                  <td className="px-5 py-3 text-brand-700">{MONEY(a.paid as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="mb-4 font-bold text-brand-950">Leads by Source</h2>
        <div className="flex flex-wrap gap-3">
          {byLeadSource.map((s) => (
            <div key={s.source as string} className="rounded-xl border border-brand-100 px-4 py-3">
              <p className="text-sm font-semibold text-brand-950">{s.source as string}</p>
              <Badge className="mt-1 bg-brand-50 text-brand-700 ring-brand-600/20">{s.c as number} leads</Badge>
            </div>
          ))}
        </div>
      </Card>
    </Container>
  );
}
