import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { AssignmentControls } from "@/components/admin/AssignmentControls";
import { CreateTransactionForm } from "@/components/admin/CreateTransactionForm";
import { LeadEditForm } from "@/components/admin/LeadEditForm";
import { Badge, Card, Container } from "@/components/ui";
import { DATETIME, LEAD_STATUS_COLORS, LEAD_STATUS_LABELS, MONEY } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminLeadDetailPage(props: PageProps<"/admin/leads/[id]">) {
  await requireAdmin();
  const { id } = await props.params;
  const db = getDb();

  const lead = await db
    .prepare(
      `SELECT l.*, p.first_name AS agent_first, p.last_name AS agent_last
       FROM leads l LEFT JOIN users u ON u.id = l.assigned_agent_id
       LEFT JOIN agent_profiles p ON p.user_id = u.id
       WHERE l.id = ?`
    )
    .get(id) as Record<string, unknown> | undefined;
  if (!lead) notFound();

  const history = await db.prepare(
    `SELECT h.*, p.first_name AS agent_first, p.last_name AS agent_last
     FROM lead_assignments h
     LEFT JOIN agent_profiles p ON p.user_id = h.agent_id
     WHERE h.lead_id = ? ORDER BY h.assigned_at DESC`
  ).all(id) as Array<Record<string, unknown>>;

  const appointments = await db.prepare(
    `SELECT a.*, p.first_name AS agent_first, p.last_name AS agent_last
     FROM appointments a LEFT JOIN agent_profiles p ON p.user_id = a.agent_id
     WHERE a.lead_id = ? ORDER BY a.scheduled_at DESC`
  ).all(id) as Array<Record<string, unknown>>;

  const transactions = await db.prepare("SELECT * FROM transactions WHERE lead_id = ? ORDER BY created_at DESC").all(id) as Array<Record<string, unknown>>;

  const agents = await db
    .prepare(
      `SELECT u.id, p.first_name, p.last_name, p.primary_city, p.state,
         (SELECT COUNT(*) FROM leads l WHERE l.assigned_agent_id = u.id AND l.status NOT IN ('closed','lost')) AS active_count,
         p.capacity
       FROM users u JOIN agent_profiles p ON p.user_id = u.id
       WHERE u.role = 'agent' AND u.status = 'active' AND u.activated = 1 AND u.license_verified = 1 AND u.market_approved = 1
       ORDER BY p.first_name`
    )
    .all() as Array<Record<string, unknown>>;

  const agentOptions = agents.map((a) => ({
    id: a.id as number,
    label: `${a.first_name} ${a.last_name} — ${a.primary_city}, ${a.state} (${a.active_count}/${a.capacity} leads)`,
  }));

  const assignedAgentId = (lead.assigned_agent_id as number | null) ?? null;

  return (
    <Container className="!px-0">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/leads" className="text-sm font-medium text-brand-500 hover:text-brand-950">← All leads</Link>
          <h1 className="mt-1 font-serif text-2xl font-bold text-brand-950">
            {lead.first_name as string} {lead.last_name as string}
          </h1>
          <p className="text-sm text-brand-500">
            {lead.lead_type as string} · {lead.specialty as string} · {lead.city as string}, {lead.state as string} {lead.zip as string}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={LEAD_STATUS_COLORS[lead.status as string]}>
            {LEAD_STATUS_LABELS[lead.status as string]}
          </Badge>
          {lead.agent_first ? (
            <Badge className="bg-emerald-100 text-emerald-800 ring-emerald-600/20">
              {String(lead.agent_first)} {String(lead.agent_last)}
            </Badge>
          ) : (
            <Badge className="bg-brand-100 text-brand-700 ring-brand-600/20">Unassigned</Badge>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-bold text-brand-950">Contact</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-brand-400">Phone</dt><dd className="font-medium text-brand-950">{lead.phone as string}</dd></div>
              <div className="flex justify-between"><dt className="text-brand-400">Email</dt><dd className="font-medium text-brand-950">{lead.email as string}</dd></div>
              <div className="flex justify-between"><dt className="text-brand-400">Budget</dt><dd className="font-medium text-brand-950">{MONEY(lead.budget_min as number | null)}{lead.budget_max ? ` – ${MONEY(lead.budget_max as number)}` : ""}</dd></div>
              <div className="flex justify-between"><dt className="text-brand-400">Source</dt><dd className="font-medium text-brand-950">{lead.source as string}</dd></div>
              <div className="flex justify-between"><dt className="text-brand-400">Received</dt><dd className="font-medium text-brand-950">{DATETIME(lead.created_at as string)}</dd></div>
            </dl>
            {lead.notes ? (
              <p className="mt-3 rounded-xl bg-brand-50 p-3 text-sm italic text-brand-700">“{lead.notes as string}”</p>
            ) : null}
          </Card>

          <Card>
            <h2 className="mb-3 font-bold text-brand-950">Assignment</h2>
            <AssignmentControls leadId={Number(id)} agents={agentOptions} currentAgentId={assignedAgentId} />
          </Card>

          {transactions.length === 0 ? (
            <Card>
              <h2 className="mb-3 font-bold text-brand-950">Transaction</h2>
              {assignedAgentId ? (
                <CreateTransactionForm
                  leadId={Number(id)}
                  agentId={assignedAgentId}
                  clientName={`${lead.first_name} ${lead.last_name}`}
                />
              ) : (
                <p className="text-sm text-brand-500">Assign an agent before recording a transaction.</p>
              )}
            </Card>
          ) : null}
        </div>

        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-bold text-brand-950">Edit Lead</h2>
          <LeadEditForm lead={lead} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-bold text-brand-950">Assignment History</h2>
          {history.length === 0 ? (
            <p className="text-sm text-brand-500">No assignment history.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {history.map((h) => (
                <div key={h.id as number} className="rounded-xl border border-brand-100 p-3">
                  <p className="font-medium text-brand-950">
                    {String(h.agent_first)} {String(h.agent_last)}
                  </p>
                  <p className="text-brand-600">{h.reason as string}</p>
                  <p className="mt-0.5 text-xs text-brand-400">{DATETIME(h.assigned_at as string)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-bold text-brand-950">Appointments</h2>
          {appointments.length === 0 ? (
            <p className="text-sm text-brand-500">No appointments for this lead.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {appointments.map((a) => (
                <div key={a.id as number} className="rounded-xl border border-brand-100 p-3">
                  <p className="font-medium text-brand-950">
                    {DATETIME(a.scheduled_at as string)} · {a.type as string}
                  </p>
                  <p className="text-brand-600">With {String(a.agent_first)} {String(a.agent_last)}</p>
                  <p className="text-xs text-brand-400">Status: {a.status as string}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Container>
  );
}
