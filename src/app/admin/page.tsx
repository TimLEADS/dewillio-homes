import Link from "next/link";
import { ArrowRight, DollarSign, Users } from "lucide-react";
import { adminStats } from "@/lib/queries";
import { requireAdmin } from "@/lib/auth";
import { after } from "next/server";
import { runAutomationsIfDue } from "@/lib/automations";
import { Card, Container, StatCard } from "@/components/ui";
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
      <p className="mt-1 text-sm text-brand-500">Activations at a glance.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <StatCard label="Agents" value={s.agents} sub={`${s.activeAgents} active · ${s.pendingAgents} pending`} icon={<Users size={20} />} />
        <StatCard label="Activation Revenue" value={MONEY(s.activationRevenue)} sub="From $1 activations" icon={<DollarSign size={20} />} />
      </div>

      <Card className="mt-8">
        <h2 className="mb-4 font-bold text-brand-950">Quick Actions</h2>
        <Link href="/admin/payments" className="flex items-center justify-between rounded-xl border border-brand-100 p-4 hover:border-brand-300">
          <span>
            <p className="font-semibold text-brand-950">Activation Payments &amp; Queue</p>
            <p className="text-sm text-brand-500">Review new activations, send verification codes, and approve accounts.</p>
          </span>
          <ArrowRight size={18} className="text-brand-400" />
        </Link>
      </Card>
    </Container>
  );
}
