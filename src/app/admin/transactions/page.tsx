import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { TransactionUpdateForm } from "@/components/admin/TransactionUpdateForm";
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

export default async function AdminTransactionsPage() {
  await requireAdmin();
  const db = getDb();
  const txs = db
    .prepare(
      `SELECT t.*, p.first_name AS agent_first, p.last_name AS agent_last
       FROM transactions t LEFT JOIN agent_profiles p ON p.user_id = t.agent_id
       ORDER BY t.created_at DESC`
    )
    .all() as Array<Record<string, unknown>>;

  return (
    <Container className="!px-0">
      <h1 className="font-serif text-2xl font-bold text-brand-950">Transactions & Referral Fees</h1>
      <p className="mt-1 text-sm text-brand-500">
        Track status, closing and the 20% referral fee on every referred transaction.
      </p>

      <div className="mt-6 space-y-4">
        {txs.length === 0 ? (
          <Card>
            <p className="text-sm text-brand-500">No transactions yet. Record one from a lead.</p>
          </Card>
        ) : (
          txs.map((t) => (
            <Card key={t.id as number} className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-brand-950">{t.client_name as string}</p>
                  <p className="text-sm text-brand-600">
                    {t.property_address as string} · Agent: {String(t.agent_first)} {String(t.agent_last)}
                  </p>
                  <p className="text-xs text-brand-400">
                    Closing {DATE(t.closing_date as string | null)} · Est. {MONEY(t.estimated_value as number | null)} · Fee{" "}
                    <span className="font-semibold text-accent-700">{MONEY(t.referral_fee as number | null)}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className={TX_STYLE[t.status as string] ?? "bg-brand-100 text-brand-700 ring-brand-600/20"}>
                    {TRANSACTION_STATUS_LABELS[t.status as string]}
                  </Badge>
                  <Badge className={FEE_STYLE[t.referral_fee_status as string] ?? "bg-brand-100 text-brand-700 ring-brand-600/20"}>
                    {REFERRAL_FEE_STATUS_LABELS[t.referral_fee_status as string]}
                  </Badge>
                </div>
              </div>
              <div className="mt-4 border-t border-brand-100 pt-4">
                <TransactionUpdateForm
                  tx={{
                    id: t.id as number,
                    status: t.status as string,
                    fee_status: t.referral_fee_status as string,
                    gross_commission: (t.gross_commission as number | null) ?? 0,
                  }}
                />
              </div>
            </Card>
          ))
        )}
      </div>
    </Container>
  );
}
