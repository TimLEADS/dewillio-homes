import { KeyRound, ShieldCheck, Clock } from "lucide-react";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Badge, Card, Container } from "@/components/ui";
import { DATETIME } from "@/lib/constants";
import { stageLabel } from "@/lib/activation";
import { ActivationControls } from "@/components/admin/ActivationControls";
import { AutoRefresh } from "@/components/admin/AutoRefresh";

export const dynamic = "force-dynamic";

const STAGE_BADGE: Record<string, string> = {
  waiting: "bg-amber-100 text-amber-800 ring-amber-600/20",
  otp: "bg-sky-100 text-sky-800 ring-sky-600/20",
  otp_verified: "bg-indigo-100 text-indigo-800 ring-indigo-600/20",
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

export default async function AdminActivationsPage() {
  await requireAdmin();
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
       WHERE u.role = 'agent' AND u.activation_stage IN ('waiting','otp','otp_verified','rejected')
       ORDER BY u.activation_stage_updated_at DESC NULLS LAST, u.created_at DESC`
    )
    .all()) as QueueRow[];

  const awaiting = rows.filter((r) => r.stage === "waiting" || r.stage === "otp_verified").length;

  return (
    <Container className="!px-0">
      <AutoRefresh seconds={5} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-brand-950">Activation Queue</h1>
          <p className="mt-1 max-w-2xl text-sm text-brand-500">
            Applicants who paid the $1 fee are held on a live loading screen. Send a verification code
            or approve them — their screen follows your choice within seconds.
          </p>
        </div>
        <Badge className="shrink-0 bg-brand-950 text-white ring-brand-950/20">
          <span className="ping-dot mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent-400" />
          {awaiting} awaiting you
        </Badge>
      </div>

      {rows.length === 0 ? (
        <Card className="mt-6 flex flex-col items-center justify-center py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-400">
            <ShieldCheck size={24} />
          </span>
          <p className="mt-4 font-semibold text-brand-950">The queue is clear</p>
          <p className="mt-1 text-sm text-brand-500">New activations will appear here the moment someone pays.</p>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
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
    </Container>
  );
}
