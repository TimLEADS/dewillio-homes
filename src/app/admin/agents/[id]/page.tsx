import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { AgentReviewForm } from "@/components/admin/AgentReviewForm";
import { SendNotificationForm } from "@/components/admin/SendNotificationForm";
import { Badge, Card, Container } from "@/components/ui";
import { DATE, MONEY } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminAgentDetailPage(props: PageProps<"/admin/agents/[id]">) {
  await requireAdmin();
  const { id } = await props.params;
  const db = getDb();

  const agent = db
    .prepare(
      `SELECT u.id, u.email, u.status, u.activated, u.license_verified, u.market_approved, u.onboarding_completed, u.created_at, u.updated_at,
              p.first_name, p.last_name, p.phone, p.brokerage, p.license_number, p.license_state, p.years_experience,
              p.primary_city, p.state, p.zip_codes, p.service_radius, p.lead_type, p.specialties, p.preferred_contact,
              p.working_hours, p.weekend_availability, p.phone_availability, p.bio, p.website, p.capacity, p.avg_response_hours
       FROM users u LEFT JOIN agent_profiles p ON p.user_id = u.id
       WHERE u.id = ? AND u.role = 'agent'`
    )
    .get(id) as Record<string, unknown> | undefined;
  if (!agent) notFound();

  const payments = db.prepare("SELECT * FROM activation_payments WHERE user_id = ? ORDER BY created_at DESC").all(id) as Array<Record<string, unknown>>;
  const leads = db.prepare("SELECT id, first_name, last_name, lead_type, city, state, zip, status, created_at FROM leads WHERE assigned_agent_id = ? ORDER BY created_at DESC").all(id) as Array<Record<string, unknown>>;
  const history = db.prepare("SELECT * FROM lead_assignments WHERE agent_id = ? ORDER BY assigned_at DESC LIMIT 20").all(id) as Array<Record<string, unknown>>;
  const transactions = db.prepare("SELECT id, client_name, status, gross_commission, referral_fee, referral_fee_status FROM transactions WHERE agent_id = ? ORDER BY created_at DESC").all(id) as Array<Record<string, unknown>>;

  const name = `${agent.first_name ?? "Unknown"} ${agent.last_name ?? ""}`;
  const zipCodes = JSON.parse(String(agent.zip_codes ?? "[]")) as string[];
  const specialties = JSON.parse(String(agent.specialties ?? "[]")) as string[];

  const profRows: Array<[string, unknown]> = [
    ["Brokerage", agent.brokerage],
    ["License #", agent.license_number],
    ["License State", agent.license_state],
    ["Years Experience", agent.years_experience],
    ["Phone", agent.phone],
    ["Avg Response", agent.avg_response_hours != null ? `${agent.avg_response_hours}h` : "—"],
  ];

  const marketRows: Array<[string, unknown]> = [
    ["City", agent.primary_city],
    ["State", agent.state],
    ["Radius", agent.service_radius != null ? `${agent.service_radius} mi` : "—"],
    ["Type", agent.lead_type],
    ["Capacity", agent.capacity],
  ];

  return (
    <Container className="!px-0">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/agents" className="text-sm font-medium text-brand-500 hover:text-brand-950">← All agents</Link>
          <h1 className="mt-1 font-serif text-2xl font-bold text-brand-950">{name}</h1>
          <p className="text-sm text-brand-500">{agent.email as string} · joined {DATE(agent.created_at as string)}</p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-800 ring-emerald-600/20">Status: {agent.status as string}</Badge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="mb-4 font-bold text-brand-950">Professional</h2>
          <dl className="space-y-2 text-sm">
            {profRows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-brand-400">{k}</dt>
                <dd className="text-right font-medium text-brand-950">{String(v ?? "—")}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <h2 className="mb-4 font-bold text-brand-950">Market</h2>
          <dl className="space-y-2 text-sm">
            {marketRows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-brand-400">{k}</dt>
                <dd className="text-right font-medium text-brand-950">{String(v ?? "—")}</dd>
              </div>
            ))}
            <div>
              <dt className="text-brand-400">ZIP Codes</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {zipCodes.map((z) => (
                  <span key={z} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800">{z}</span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-brand-400">Specialties</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {specialties.map((s) => (
                  <span key={s} className="rounded-full bg-accent-50 px-2 py-0.5 text-xs font-medium text-accent-700">{s.replace(/-/g, " ")}</span>
                ))}
              </dd>
            </div>
          </dl>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 font-bold text-brand-950">Review & Approve</h2>
            <AgentReviewForm
              userId={Number(id)}
              status={String(agent.status)}
              licenseVerified={Number(agent.license_verified)}
              marketApproved={Number(agent.market_approved)}
            />
          </Card>
          <Card>
            <h2 className="mb-4 font-bold text-brand-950">Send Notification</h2>
            <SendNotificationForm userId={Number(id)} />
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-bold text-brand-950">Activation Payments</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-brand-500">No activation payment.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {payments.map((p) => (
                <div key={p.id as number} className="flex justify-between rounded-xl border border-brand-100 p-3">
                  <span className="text-brand-600">{p.reference as string} · {p.method as string}</span>
                  <span className="font-semibold text-brand-950">{MONEY(Number(p.amount))}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-bold text-brand-950">Transactions</h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-brand-500">No transactions.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {transactions.map((t) => (
                <div key={t.id as number} className="flex justify-between rounded-xl border border-brand-100 p-3">
                  <span className="font-medium text-brand-950">{t.client_name as string} <span className="text-brand-400">({t.status as string})</span></span>
                  <span className="font-semibold text-accent-700">{MONEY(Number(t.referral_fee))}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-bold text-brand-950">Assigned Leads</h2>
          {leads.length === 0 ? (
            <p className="text-sm text-brand-500">No leads assigned.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {leads.map((l) => (
                <div key={l.id as number} className="flex items-center justify-between rounded-xl border border-brand-100 p-3">
                  <Link href={`/admin/leads/${l.id}`} className="font-medium text-brand-950 hover:underline">
                    {l.first_name as string} {l.last_name as string}
                  </Link>
                  <span className="text-brand-400">{l.lead_type as string} · {l.city as string}, {l.state as string} {l.zip as string} · {l.status as string}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-bold text-brand-950">Assignment History</h2>
          {history.length === 0 ? (
            <p className="text-sm text-brand-500">No assignment history.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {history.map((h) => (
                <div key={h.id as number} className="rounded-xl border border-brand-100 p-3">
                  <p className="text-brand-700">{h.reason as string}</p>
                  <p className="mt-0.5 text-xs text-brand-400">Lead #{h.lead_id as number} · {DATE(h.assigned_at as string)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Container>
  );
}
