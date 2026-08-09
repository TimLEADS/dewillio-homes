import { agentTransactions } from "@/lib/queries";
import { requireAgent } from "@/lib/auth";
import { Badge, Card, Container } from "@/components/ui";
import { DATE, MONEY, REFERRAL_FEE_STATUS_LABELS, TRANSACTION_STATUS_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

const TX_STYLE: Record<string, string> = {
  pending: "bg-brand-100 text-brand-700 ring-brand-600/20",
  under_contract: "bg-sky-100 text-sky-800 ring-sky-600/20",
  closed: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
};

const FEE_STYLE: Record<string, string> = {
  pending: "bg-brand-100 text-brand-700 ring-brand-600/20",
  under_contract: "bg-sky-100 text-sky-800 ring-sky-600/20",
  closed_fee_due: "bg-amber-100 text-amber-800 ring-amber-600/20",
  paid: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  disputed: "bg-rose-100 text-rose-800 ring-rose-600/20",
};

export default async function AgentTransactionsPage() {
  const user = await requireAgent();
  const txs = await agentTransactions(user.id);

  return (
    <Container className="!px-0">
      <h1 className="font-serif text-2xl font-bold text-brand-950">Transactions</h1>
      <p className="mt-1 text-sm text-brand-500">Referred transactions tracked from under contract to closing.</p>

      <div className="mt-6 space-y-3">
        {txs.length === 0 ? (
          <Card>
            <p className="text-sm text-brand-500">
              No transactions yet. When a referred lead goes under contract, it appears here.
            </p>
          </Card>
        ) : (
          txs.map((t) => (
            <Card key={t.id} className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-brand-950">{t.client_name ?? "Client"}</p>
                  <p className="text-sm text-brand-600">{t.property_address ?? "Address TBD"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={TX_STYLE[t.status] ?? "bg-brand-100 text-brand-700 ring-brand-600/20"}>
                    {TRANSACTION_STATUS_LABELS[t.status]}
                  </Badge>
                  <Badge className={FEE_STYLE[t.referral_fee_status] ?? "bg-brand-100 text-brand-700 ring-brand-600/20"}>
                    {REFERRAL_FEE_STATUS_LABELS[t.referral_fee_status]}
                  </Badge>
                </div>
              </div>
              <div className="mt-4 grid gap-4 border-t border-brand-100 pt-4 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs text-brand-400">Est. Value</p>
                  <p className="font-semibold text-brand-950">{MONEY(t.estimated_value)}</p>
                </div>
                <div>
                  <p className="text-xs text-brand-400">Gross Commission</p>
                  <p className="font-semibold text-brand-950">{MONEY(t.gross_commission)}</p>
                </div>
                <div>
                  <p className="text-xs text-brand-400">20% Referral Fee</p>
                  <p className="font-semibold text-accent-700">{MONEY(t.referral_fee)}</p>
                </div>
                <div>
                  <p className="text-xs text-brand-400">Closing Date</p>
                  <p className="font-semibold text-brand-950">{DATE(t.closing_date)}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </Container>
  );
}
