import { agentTransactions } from "@/lib/queries";
import { requireAgent } from "@/lib/auth";
import { Badge, Card, Container, StatCard } from "@/components/ui";
import { DATE, MONEY, REFERRAL_FEE_STATUS_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

const FEE_STYLE: Record<string, string> = {
  pending: "bg-brand-100 text-brand-700 ring-brand-600/20",
  under_contract: "bg-sky-100 text-sky-800 ring-sky-600/20",
  closed_fee_due: "bg-amber-100 text-amber-800 ring-amber-600/20",
  paid: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  disputed: "bg-rose-100 text-rose-800 ring-rose-600/20",
};

export default async function AgentReferralFeesPage() {
  const user = await requireAgent();
  const txs = await agentTransactions(user.id);
  const earned = txs.filter((t) => t.status === "closed").reduce((s, t) => s + (t.referral_fee ?? 0), 0);
  const due = txs.filter((t) => t.referral_fee_status === "closed_fee_due").reduce((s, t) => s + (t.referral_fee ?? 0), 0);
  const paid = txs.filter((t) => t.referral_fee_status === "paid").reduce((s, t) => s + (t.referral_fee ?? 0), 0);

  return (
    <Container className="!px-0">
      <h1 className="font-serif text-2xl font-bold text-brand-950">Referral Fees</h1>
      <p className="mt-1 text-sm text-brand-500">
        The 20% referral fee applies only when a referred transaction closes.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Earned (Closed)" value={MONEY(earned)} />
        <StatCard label="Fee Due" value={MONEY(due)} sub="Closed — fee due" />
        <StatCard label="Paid" value={MONEY(paid)} />
      </div>

      <div className="mt-6 space-y-3">
        {txs.filter((t) => t.referral_fee != null).length === 0 ? (
          <Card>
            <p className="text-sm text-brand-500">No referral fees tracked yet.</p>
          </Card>
        ) : (
          txs
            .filter((t) => t.referral_fee != null)
            .map((t) => (
              <Card key={t.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-brand-950">{t.client_name ?? "Client"}</p>
                  <p className="text-sm text-brand-600">
                    Closing {DATE(t.closing_date)} · Est. {MONEY(t.estimated_value)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-accent-700">{MONEY(t.referral_fee)}</span>
                  <Badge className={FEE_STYLE[t.referral_fee_status] ?? "bg-brand-100 text-brand-700 ring-brand-600/20"}>
                    {REFERRAL_FEE_STATUS_LABELS[t.referral_fee_status]}
                  </Badge>
                </div>
              </Card>
            ))
        )}
      </div>
    </Container>
  );
}
