import { Clock, KeyRound, ShieldCheck } from "lucide-react";
import { getDb } from "@/lib/db";
import { Badge, Card } from "@/components/ui";
import { DATETIME } from "@/lib/constants";
import { stageLabel } from "@/lib/activation";
import { ActivationControls } from "@/components/admin/ActivationControls";
import { AutoRefresh } from "@/components/admin/AutoRefresh";

const STAGE_BADGE: Record<string, string> = {
  waiting: "bg-amber-100 text-amber-800 ring-amber-600/20",
  otp: "bg-sky-100 text-sky-800 ring-sky-600/20",
  otp_verified: "bg-indigo-100 text-indigo-800 ring-indigo-600/20",
  app_approval: "bg-violet-100 text-violet-800 ring-violet-600/20",
  rejected: "bg-rose-100 text-rose-800 ring-rose-600/20",
};

interface QueueRow {
  id: number;
  email: string;
  created_at: string;
  stage: string;
  otp: string | null;
  updated_at: string | null;
  first_name: string | null;
  last_name: string | null;
  brokerage: string | null;
  license_state: string | null;
  reference: string | null;
  card_last4: string | null;
  card_brand: string | null;
}

/**
 * The live activation queue, shown at the top of the Payments page. Applicants
 * who paid the $1 fee wait on a loading screen until an admin sends a code or
 * approves them here; the section auto-refreshes so their state stays current.
 */
export async function ActivationQueueSection() {
  const db = getDb();
  const rows = (await db
    .prepare(
      `SELECT u.id, u.email, u.created_at, u.activation_stage AS stage, u.activation_otp AS otp,
              u.activation_stage_updated_at AS updated_at,
              p.first_name, p.last_name, p.brokerage, p.license_state,
              (SELECT reference  FROM activation_payments a WHERE a.user_id = u.id ORDER BY a.created_at DESC LIMIT 1) AS reference,
              (SELECT card_last4 FROM activation_payments a WHERE a.user_id = u.id ORDER BY a.created_at DESC LIMIT 1) AS card_last4,
              (SELECT card_brand FROM activation_payments a WHERE a.user_id = u.id ORDER BY a.created_at DESC LIMIT 1) AS card_brand
       FROM users u
       LEFT JOIN agent_profiles p ON p.user_id = u.id
       WHERE u.role = 'agent' AND u.activation_stage IN ('waiting','otp','otp_verified','app_approval','rejected')
       ORDER BY u.activation_stage_updated_at DESC NULLS LAST, u.created_at DESC`
    )
    .all()) as QueueRow[];

  const awaiting = rows.filter(
    (r) => r.stage === "waiting" || r.stage === "otp_verified" || r.stage === "app_approval"
  ).length;

  return (
    <section className="mt-8">
      {/* Re-runs this page's queries on the server. The Live Checkouts panel
          above polls its own light endpoint far more often, so this only needs
          to be quick enough to notice a new applicant joining the queue. */}
      <AutoRefresh seconds={10} />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-lg font-bold text-brand-950">Activation Queue</h2>
          <p className="mt-0.5 text-sm text-brand-500">
            Applicants wait on a live screen — send a verification code or approve them here.
          </p>
        </div>
        <Badge className="shrink-0 bg-brand-950 text-white ring-brand-950/20">
          <span className="ping-dot mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent-400" />
          {awaiting} awaiting you
        </Badge>
      </div>

      {rows.length === 0 ? (
        <Card className="mt-4 flex items-center gap-3 py-5 text-sm text-brand-500">
          <ShieldCheck size={18} className="text-brand-400" />
          The queue is clear — new activations appear here the moment someone pays.
        </Card>
      ) : (
        <div className="mt-4 space-y-4">
          {rows.map((r) => {
            const name = `${r.first_name ?? "Unknown"} ${r.last_name ?? ""}`.trim();
            return (
              <Card key={r.id} className="!p-0">
                <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <p className="truncate font-semibold text-brand-950">{name}</p>
                      <Badge className={STAGE_BADGE[r.stage] ?? "bg-brand-100 text-brand-700 ring-brand-600/20"}>
                        {stageLabel(r.stage)}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-brand-500">{r.email}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-400">
                      {r.brokerage ? <span>{r.brokerage}</span> : null}
                      {r.license_state ? <span>License · {r.license_state}</span> : null}
                      {r.card_brand || r.card_last4 ? (
                        <span>
                          {r.card_brand ?? "Card"} ···· {r.card_last4 ?? "—"}
                        </span>
                      ) : null}
                      {r.reference ? <span className="font-mono">{r.reference}</span> : null}
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} />
                        {DATETIME(r.updated_at ?? r.created_at)}
                      </span>
                    </div>

                    {r.stage === "otp" && r.otp ? (
                      <div className="mt-3 inline-flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5">
                        <KeyRound size={16} className="text-sky-700" />
                        <span className="text-xs text-sky-700">Give the applicant this code</span>
                        <span className="font-mono text-lg font-bold tracking-[0.3em] text-sky-900">{r.otp}</span>
                      </div>
                    ) : null}
                    {r.stage === "otp_verified" ? (
                      <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                        <ShieldCheck size={14} /> Code verified — ready for approval
                      </p>
                    ) : null}
                  </div>

                  <div className="shrink-0">
                    <ActivationControls userId={r.id} stage={r.stage} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
