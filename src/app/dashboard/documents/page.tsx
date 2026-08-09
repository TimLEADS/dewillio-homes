import { CheckCircle2, FileText, Receipt } from "lucide-react";
import { getDb, REFERRAL_FEE_RATE } from "@/lib/db";
import { requireAgent } from "@/lib/auth";
import { acceptAgreementAction } from "@/lib/actions/agent";
import { Badge, Card, Container } from "@/components/ui";
import { DATETIME, MONEY } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AgentDocumentsPage() {
  const user = await requireAgent();
  const db = getDb();

  const agreement = await db
    .prepare(
      `SELECT version, title, body, referral_rate, effective_date
       FROM agreement_versions WHERE active = 1 ORDER BY id DESC LIMIT 1`
    )
    .get() as
    | { version: string; title: string; body: string; referral_rate: number; effective_date: string }
    | undefined;

  const payments = await db
    .prepare("SELECT * FROM activation_payments WHERE user_id = ? ORDER BY created_at DESC")
    .all(user.id) as Array<{
    id: number;
    amount: number;
    method: string;
    status: string;
    reference: string;
    created_at: string;
  }>;

  const accepted = !!user.agreement_accepted_at;
  const currentVersion = agreement?.version ?? "1.0";
  const outOfDate = accepted && user.agreement_version !== currentVersion;

  return (
    <Container className="!px-0">
      <h1 className="font-serif text-2xl font-bold text-brand-950">Documents &amp; Agreement</h1>
      <p className="mt-1 text-sm text-brand-500">
        Your signed referral agreement, activation receipt and program terms.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="!p-5">
          <div className="flex items-center gap-2 text-brand-500">
            <FileText size={16} />
            <p className="text-sm">Agreement status</p>
          </div>
          <p className="mt-2 text-lg font-bold text-brand-950">
            {accepted ? (outOfDate ? "Update required" : "Accepted") : "Not accepted"}
          </p>
          {accepted ? (
            <p className="mt-1 text-xs text-brand-400">
              v{user.agreement_version} · {DATETIME(user.agreement_accepted_at)}
            </p>
          ) : (
            <p className="mt-1 text-xs text-brand-400">Accept below to receive leads.</p>
          )}
        </Card>
        <Card className="!p-5">
          <div className="flex items-center gap-2 text-brand-500">
            <Receipt size={16} />
            <p className="text-sm">Activation</p>
          </div>
          <p className="mt-2 text-lg font-bold text-brand-950">
            {user.activated ? "Activated" : "Not activated"}
          </p>
          <p className="mt-1 text-xs text-brand-400">One-time fee · not a subscription</p>
        </Card>
        <Card className="!p-5">
          <div className="flex items-center gap-2 text-brand-500">
            <CheckCircle2 size={16} />
            <p className="text-sm">Referral rate</p>
          </div>
          <p className="mt-2 text-lg font-bold text-brand-950">
            {Math.round((agreement?.referral_rate ?? REFERRAL_FEE_RATE) * 100)}%
          </p>
          <p className="mt-1 text-xs text-brand-400">Only on closed referred transactions</p>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-brand-950">{agreement?.title ?? "Dewilio Homes Referral Agreement"}</h2>
            <p className="text-xs text-brand-400">
              Version {currentVersion}
              {agreement ? ` · effective ${DATETIME(agreement.effective_date)}` : ""}
            </p>
          </div>
          {accepted && !outOfDate ? (
            <Badge className="bg-emerald-100 text-emerald-800 ring-emerald-600/20">
              Accepted {DATETIME(user.agreement_accepted_at)}
            </Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-800 ring-amber-600/20">Signature required</Badge>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto rounded-xl border border-brand-100 bg-brand-50/40 p-5">
          <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-brand-700">
            {agreement?.body ?? "The referral agreement is being updated. Please check back shortly."}
          </pre>
        </div>

        {!accepted || outOfDate ? (
          <form action={acceptAgreementAction} className="mt-4 flex flex-wrap items-center gap-3">
            <input type="hidden" name="version" value={currentVersion} />
            <button
              type="submit"
              className="rounded-lg bg-brand-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
            >
              {outOfDate ? `Accept updated agreement (v${currentVersion})` : "I accept the referral agreement"}
            </button>
            <p className="text-xs text-brand-400">
              Accepting records your name, the version and a timestamp in the audit log.
            </p>
          </form>
        ) : null}
      </Card>

      <Card className="mt-6">
        <h2 className="mb-4 font-bold text-brand-950">Activation Receipt</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-brand-500">No activation payment on file.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-brand-100 text-xs uppercase tracking-wider text-brand-400">
                  <th className="py-2 pr-4">Reference</th>
                  <th className="py-2 pr-4">Method</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-brand-50">
                    <td className="py-2.5 pr-4 font-mono text-xs text-brand-700">{p.reference}</td>
                    <td className="py-2.5 pr-4 text-brand-700">{p.method}</td>
                    <td className="py-2.5 pr-4 font-semibold text-brand-950">{MONEY(p.amount)}</td>
                    <td className="py-2.5 pr-4">
                      <Badge className="bg-emerald-100 text-emerald-800 ring-emerald-600/20">{p.status}</Badge>
                    </td>
                    <td className="py-2.5 text-brand-500">{DATETIME(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-6 text-xs leading-relaxed text-brand-400">
        Referral fees are generally payable broker-to-broker. Confirm the arrangement with your sponsoring
        broker and applicable state regulations before participating. This page is a program document and is
        not legal advice.
      </p>
    </Container>
  );
}
