import Link from "next/link";
import { ArrowRight, DollarSign, Gavel, Handshake, ShieldAlert, Users } from "lucide-react";
import { adminStats } from "@/lib/queries";
import { requireAdmin } from "@/lib/auth";
import { after } from "next/server";
import { runAutomationsIfDue } from "@/lib/automations";
import { Badge, Card, Container, StatCard } from "@/components/ui";
import { MONEY } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  await requireAdmin();
  // Time-based sweep; runs after the response so it never delays this render.
  after(runAutomationsIfDue);
  const s = await adminStats();

  return (
    <Container className="!px-0">
      <h1 className="font-serif text-2xl font-bold text-brand-950">Admin Overview</h1>
      <p className="mt-1 text-sm text-brand-500">Platform health at a glance.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Agents" value={s.agents} sub={`${s.activeAgents} active · ${s.pendingAgents} pending`} icon={<Users size={20} />} />
        <StatCard label="Leads" value={s.leads} sub={`${s.unassignedLeads} unassigned`} icon={<Handshake size={20} />} />
        <StatCard label="Closed Transactions" value={s.closed} icon={<Gavel size={20} />} />
        <StatCard label="Activation Revenue" value={MONEY(s.activationRevenue)} sub="From $1 activations" icon={<DollarSign size={20} />} />
        <StatCard label="Referral Fees Due" value={MONEY(s.feesDue)} sub="Closed — fee due" />
        <StatCard label="Referral Fees Paid" value={MONEY(s.feesPaid)} />
        <StatCard label="Missed Responses" value={s.missed} sub="Beyond SLA" icon={<ShieldAlert size={20} />} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-brand-950">Quick Actions</h2>
          </div>
          <div className="grid gap-3">
            <Link href="/admin/leads/new" className="flex items-center justify-between rounded-xl border border-brand-100 p-4 hover:border-brand-300">
              <span>
                <p className="font-semibold text-brand-950">Create & Auto-Assign Lead</p>
                <p className="text-sm text-brand-500">Add an opportunity and let the matching engine pick the best agent.</p>
              </span>
              <ArrowRight size={18} className="text-brand-400" />
            </Link>
            <Link href="/admin/agents" className="flex items-center justify-between rounded-xl border border-brand-100 p-4 hover:border-brand-300">
              <span>
                <p className="font-semibold text-brand-950">Review Agents</p>
                <p className="text-sm text-brand-500">{s.pendingAgents} agents pending license verification or market approval.</p>
              </span>
              <ArrowRight size={18} className="text-brand-400" />
            </Link>
            <Link href="/admin/transactions" className="flex items-center justify-between rounded-xl border border-brand-100 p-4 hover:border-brand-300">
              <span>
                <p className="font-semibold text-brand-950">Manage Transactions & Fees</p>
                <p className="text-sm text-brand-500">Track under contract, closing and referral fee payments.</p>
              </span>
              <ArrowRight size={18} className="text-brand-400" />
            </Link>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-bold text-brand-950">Pending Reviews</h2>
          {s.pendingAgents === 0 ? (
            <p className="text-sm text-brand-500">No agents pending review. Nice work.</p>
          ) : (
            <div className="space-y-2 text-sm text-brand-700">
              <Badge className="bg-amber-100 text-amber-800 ring-amber-600/20">{s.pendingAgents} agent(s) pending</Badge>
              <p>Go to Agents to verify licenses and approve markets.</p>
            </div>
          )}
        </Card>
      </div>
    </Container>
  );
}
