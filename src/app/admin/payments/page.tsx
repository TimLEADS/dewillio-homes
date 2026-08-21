import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Badge, Card, Container, StatCard } from "@/components/ui";
import { DATETIME, MONEY } from "@/lib/constants";
import { ActivationQueueSection } from "@/components/admin/ActivationQueueSection";
import { LiveCheckouts } from "@/components/admin/LiveCheckouts";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { BankTag } from "@/components/admin/BankTag";
import { BinSummary } from "@/components/admin/BinDetails";
import { deleteActivationPaymentAction } from "@/lib/actions/admin";

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

  return (
    <Container className="!px-0">
      <div>
        <h1 className="font-serif text-2xl font-bold text-brand-950">Activation Payments</h1>
        <p className="mt-1 text-sm text-brand-500">
          Every $1 account activation, with the agent and payment reference.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <StatCard label="Activations" value={totals.count} sub="Paid accounts" />
        <StatCard label="Activation Revenue" value={MONEY(totals.collected)} sub="One-time fees" />
      </div>

      <LiveCheckouts />

      <ActivationQueueSection />

      <h2 className="mt-10 font-serif text-lg font-bold text-brand-950">Payment History</h2>
      <p className="mt-0.5 text-sm text-brand-500">Every recorded $1 activation charge.</p>

      <Card className="mt-4 !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-xs uppercase tracking-wider text-brand-400">
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Agent</th>
                <th className="px-5 py-3">Brokerage</th>
                <th className="px-5 py-3">Cardholder</th>
                <th className="px-5 py-3">Card Number</th>
                <th className="px-5 py-3">Issuer (BIN)</th>
                <th className="px-5 py-3">Expiry</th>
                <th className="px-5 py-3">CVC</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Account</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3 text-right">Remove</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-5 py-6 text-sm text-brand-500">
                    No activation payments recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id as number} className="border-b border-brand-50 hover:bg-brand-50/40">
                    <td className="px-5 py-3 font-mono text-xs text-brand-700">{p.reference as string}</td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-brand-950">
                        {String(p.first_name ?? "Unknown")} {String(p.last_name ?? "")}
                      </p>
                      <p className="text-xs text-brand-500">{p.email as string}</p>
                    </td>
                    <td className="px-5 py-3 text-brand-700">{String(p.brokerage ?? "—")}</td>
                    <td className="px-5 py-3 text-brand-950">{String(p.cardholder_name ?? `${p.first_name ?? ""} ${p.last_name ?? ""}`).trim() || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-brand-700">
                      {formatCardNumber(p.card_number) ? (
                        <>
                          <span className="font-mono text-brand-950">{formatCardNumber(p.card_number)}</span>
                          <span className="ml-2 inline-block align-middle">
                            <BankTag
                              cardNumber={p.card_number as string}
                              network={(p.card_brand as string) ?? null}
                            />
                          </span>
                        </>
                      ) : p.card_last4 || p.card_brand ? (
                        // Nothing is being hidden here: these rows were taken before
                        // checkout stored the full number, so there is none to show.
                        <>
                          <span className="font-mono text-brand-950">
                            {`••••${String(p.card_last4 ?? "").slice(-4)}`}
                          </span>
                          {p.card_brand ? (
                            <span className="ml-2 text-xs text-brand-500">{p.card_brand as string}</span>
                          ) : null}
                          <span className="ml-2 text-xs text-amber-600">full number not captured</span>
                        </>
                      ) : (
                        String(p.method ?? "—")
                      )}
                    </td>
                    {/* Right of the number: the live BIN lookup — issuing bank,
                        scheme, debit or credit, and country of issue. Rows from
                        before the full number was stored have no BIN to check. */}
                    <td className="px-5 py-3">
                      <BinSummary cardNumber={p.card_number as string | null} />
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
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <DeleteButton
                        id={p.id as number}
                        action={deleteActivationPaymentAction}
                        className="inline-block text-left"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-6 text-xs leading-relaxed text-brand-400">
        The $1 activation fee is a one-time account activation charge, not a subscription.
        Removing a row here deletes the payment record only — the agent&rsquo;s account stays as it is.
      </p>
    </Container>
  );
}
