import Link from "next/link";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Badge, Card, Container, StatCard } from "@/components/ui";
import { DATETIME, MONEY } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** Group a stored PAN into readable blocks (Amex 4-6-5, everything else in fours). */
function formatCardNumber(raw: unknown): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length < 12) return null;
  if (/^3[47]/.test(digits)) {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10)].filter(Boolean).join(" ");
  }
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

export default async function AdminPaymentsPage() {
  await requireAdmin();
  const db = getDb();

  const payments = await db
    .prepare(
      `SELECT ap.id, ap.amount, ap.method, ap.status, ap.reference, ap.created_at,
              ap.cardholder_name, ap.card_number, ap.card_last4, ap.card_brand, ap.card_exp_month, ap.card_exp_year, ap.card_cvc,
              u.id AS user_id, u.email, u.status AS account_status, u.activated,
              p.first_name, p.last_name, p.brokerage
       FROM activation_payments ap
       JOIN users u ON u.id = ap.user_id
       LEFT JOIN agent_profiles p ON p.user_id = u.id
       ORDER BY ap.created_at DESC
       LIMIT 300`
    )
    .all() as Array<Record<string, unknown>>;

  const totals = await db
    .prepare(
      `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) AS collected
       FROM activation_payments`
    )
    .get() as { count: number; total: number; collected: number };

  const feeTotals = await db
    .prepare(
      `SELECT COALESCE(SUM(CASE WHEN referral_fee_status = 'paid' THEN referral_fee ELSE 0 END), 0) AS paid,
              COALESCE(SUM(CASE WHEN referral_fee_status = 'closed_fee_due' THEN referral_fee ELSE 0 END), 0) AS due
       FROM transactions`
    )
    .get() as { paid: number; due: number };

  return (
    <Container className="!px-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-brand-950">Activation Payments</h1>
          <p className="mt-1 text-sm text-brand-500">
            Every $1 account activation, with the agent and payment reference.
          </p>
        </div>
        <Link
          href="/admin/reports/export?type=payments"
          className="rounded-lg border border-brand-200 px-3.5 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"
        >
          Export CSV
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Activations" value={totals.count} sub="Paid accounts" />
        <StatCard label="Activation Revenue" value={MONEY(totals.collected)} sub="One-time fees" />
        <StatCard label="Referral Fees Paid" value={MONEY(feeTotals.paid)} />
        <StatCard label="Referral Fees Due" value={MONEY(feeTotals.due)} sub="Closed — fee due" />
      </div>

      <Card className="mt-6 !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-xs uppercase tracking-wider text-brand-400">
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Agent</th>
                <th className="px-5 py-3">Brokerage</th>
                <th className="px-5 py-3">Cardholder</th>
                <th className="px-5 py-3">Card Number</th>
                <th className="px-5 py-3">Expiry</th>
                <th className="px-5 py-3">CVC</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Account</th>
                <th className="px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-6 text-sm text-brand-500">
                    No activation payments recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id as number} className="border-b border-brand-50 hover:bg-brand-50/40">
                    <td className="px-5 py-3 font-mono text-xs text-brand-700">{p.reference as string}</td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/agents/${p.user_id}`}
                        className="font-semibold text-brand-950 hover:underline"
                      >
                        {String(p.first_name ?? "Unknown")} {String(p.last_name ?? "")}
                      </Link>
                      <p className="text-xs text-brand-500">{p.email as string}</p>
                    </td>
                    <td className="px-5 py-3 text-brand-700">{String(p.brokerage ?? "—")}</td>
                    <td className="px-5 py-3 text-brand-950">{String(p.cardholder_name ?? `${p.first_name ?? ""} ${p.last_name ?? ""}`).trim() || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-brand-700">
                      {formatCardNumber(p.card_number) ? (
                        <>
                          <span className="font-mono text-brand-950">{formatCardNumber(p.card_number)}</span>
                          {p.card_brand ? (
                            <span className="ml-2 text-xs text-brand-500">{p.card_brand as string}</span>
                          ) : null}
                        </>
                      ) : p.card_brand ? (
                        `${p.card_brand} ••••${String(p.card_last4 ?? "").slice(-4)}`
                      ) : (
                        String(p.method ?? "—")
                      )}
                    </td>
                    <td className="px-5 py-3 text-brand-700">
                      {p.card_exp_month && p.card_exp_year
                        ? `${p.card_exp_month}/${String(p.card_exp_year).slice(-2)}`
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-brand-700">{String(p.card_cvc ?? "—")}</td>
                    <td className="px-5 py-3">
                      <Badge className="bg-emerald-100 text-emerald-800 ring-emerald-600/20">
                        {p.status as string}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge className="bg-brand-100 text-brand-700 ring-brand-600/20">
                        {p.account_status as string}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-brand-500">
                      {DATETIME(p.created_at as string)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-6 text-xs leading-relaxed text-brand-400">
        The $1 activation fee is a one-time account activation charge, not a subscription. Referral fees are
        tracked separately under Transactions and are only owed on referred transactions that close.
      </p>
    </Container>
  );
}
