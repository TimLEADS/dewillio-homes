import Link from "next/link";
import { ArrowRight, CalendarDays, DollarSign, Gavel, Handshake, Users } from "lucide-react";
import { agentStats } from "@/lib/queries";
import { requireAgent } from "@/lib/auth";
import { runAutomations } from "@/lib/automations";
import { Badge, Card, Container, StatCard } from "@/components/ui";
import { DATE, LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, MONEY } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireAgent();
  await runAutomations();
  const s = await agentStats(user.id);

  return (
    <Container className="!px-0">
      <h1 className="font-serif text-2xl font-bold text-brand-950">
        Welcome back, {user.profile?.first_name ?? ""}
      </h1>
      <p className="mt-1 text-sm text-brand-500">Here&apos;s your pipeline at a glance.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="New Leads" value={s.newLeads} icon={<Users size={20} />} />
        <StatCard label="Active Leads" value={s.activeLeads} icon={<Handshake size={20} />} />
        <StatCard label="Appointments" value={s.appointments} icon={<CalendarDays size={20} />} />
        <StatCard label="Closed Transactions" value={s.closed} icon={<Gavel size={20} />} />
        <StatCard label="Referral Fees Earned" value={MONEY(s.feesEarned)} sub="On closed transactions" icon={<DollarSign size={20} />} />
        <StatCard label="Referral Fees Paid" value={MONEY(s.feesPaid)} sub="Marked as paid" icon={<DollarSign size={20} />} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-brand-950">Recent Leads</h2>
            <Link href="/dashboard/leads" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-950">
              All leads <ArrowRight size={14} />
            </Link>
          </div>
          {s.leads.length === 0 ? (
            <p className="text-sm text-brand-500">No leads yet. Complete review and approval to start receiving matches.</p>
          ) : (
            <div className="space-y-3">
              {s.leads.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-4 rounded-xl border border-brand-100 p-4">
                  <div>
                    <p className="font-semibold text-brand-950">{l.first_name} {l.last_name}</p>
                    <p className="text-xs text-brand-500">{l.lead_type} · {l.city}, {l.state} {l.zip}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden text-xs text-brand-400 sm:block">{DATE(l.created_at)}</span>
                    <Badge className={LEAD_STATUS_COLORS[l.status]}>{LEAD_STATUS_LABELS[l.status]}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-bold text-brand-950">Notifications</h2>
          {s.notifications.length === 0 ? (
            <p className="text-sm text-brand-500">No notifications yet.</p>
          ) : (
            <div className="space-y-3">
              {s.notifications.map((n) => (
                <div key={n.id} className={`rounded-xl border p-3 ${n.read_at ? "border-brand-100" : "border-accent-300 bg-accent-50/40"}`}>
                  <p className="text-sm font-semibold text-brand-950">{n.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-brand-600">{n.body}</p>
                  <p className="mt-1 text-[10px] text-brand-400">{DATE(n.sent_at)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Container>
  );
}
