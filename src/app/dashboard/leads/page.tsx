import Link from "next/link";
import { CalendarCheck, TriangleAlert } from "lucide-react";
import { agentLeads } from "@/lib/queries";
import { requireAgent } from "@/lib/auth";
import { runAutomations } from "@/lib/automations";
import { Badge, Card, Container } from "@/components/ui";
import { LeadActions } from "@/components/dashboard/LeadActions";
import {
  DATE,
  DATETIME,
  LEAD_STATUS_COLORS,
  LEAD_STATUS_LABELS,
  MONEY,
  SPECIALTY_LABELS,
  isMissed,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

const APPOINTMENT_STYLE: Record<string, string> = {
  scheduled: "bg-amber-100 text-amber-800 ring-amber-600/20",
  completed: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  rescheduled: "bg-sky-100 text-sky-800 ring-sky-600/20",
  cancelled: "bg-rose-100 text-rose-800 ring-rose-600/20",
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "active", label: "Active" },
  { key: "appointment", label: "Appointments" },
  { key: "closed", label: "Closed" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default async function AgentLeadsPage(props: PageProps<"/dashboard/leads">) {
  const user = await requireAgent();
  await runAutomations();

  const params = await props.searchParams;
  const raw = Array.isArray(params.view) ? params.view[0] : params.view;
  const view: FilterKey = (FILTERS.find((f) => f.key === raw)?.key ?? "all") as FilterKey;

  const all = await agentLeads(user.id);
  const matches = (l: (typeof all)[number]): boolean => {
    switch (view) {
      case "new":
        return l.status === "new";
      case "active":
        return !["closed", "lost"].includes(l.status);
      case "appointment":
        return l.status === "appointment" || !!l.appointment_status;
      case "closed":
        return l.status === "closed";
      default:
        return true;
    }
  };
  const leads = all.filter(matches);

  const countFor = (key: FilterKey): number => {
    switch (key) {
      case "new":
        return all.filter((l) => l.status === "new").length;
      case "active":
        return all.filter((l) => !["closed", "lost"].includes(l.status)).length;
      case "appointment":
        return all.filter((l) => l.status === "appointment" || !!l.appointment_status).length;
      case "closed":
        return all.filter((l) => l.status === "closed").length;
      default:
        return all.length;
    }
  };

  return (
    <Container className="!px-0">
      <h1 className="font-serif text-2xl font-bold text-brand-950">Leads</h1>
      <p className="mt-1 text-sm text-brand-500">Opportunities referred to you by Dewilio Homes.</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/dashboard/leads" : `/dashboard/leads?view=${f.key}`}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
              view === f.key
                ? "bg-brand-950 text-white"
                : "border border-brand-200 text-brand-700 hover:bg-brand-50"
            }`}
          >
            {f.label} ({countFor(f.key)})
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {leads.length === 0 ? (
          <Card>
            <p className="text-sm text-brand-500">
              {all.length === 0
                ? "No leads assigned yet. Your account must be active, approved and verified to receive matches."
                : "No leads in this view."}
            </p>
          </Card>
        ) : (
          leads.map((l) => {
            const missed = isMissed(l);
            return (
              <Card key={l.id} className={`p-5 ${missed ? "border-rose-200 bg-rose-50/30" : ""}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-brand-950">
                        {l.first_name} {l.last_name}
                      </h3>
                      <Badge className={LEAD_STATUS_COLORS[l.status]}>{LEAD_STATUS_LABELS[l.status]}</Badge>
                      <Badge className="bg-brand-100 text-brand-700 ring-brand-600/20">{l.lead_type}</Badge>
                      {l.appointment_status ? (
                        <Badge className={APPOINTMENT_STYLE[l.appointment_status] ?? "bg-brand-100 text-brand-700 ring-brand-600/20"}>
                          <CalendarCheck size={12} className="mr-1" />
                          {l.appointment_status}
                        </Badge>
                      ) : null}
                      {missed ? (
                        <Badge className="bg-rose-100 text-rose-800 ring-rose-600/20">
                          <TriangleAlert size={12} className="mr-1" />
                          Response overdue
                        </Badge>
                      ) : null}
                    </div>

                    <p className="mt-1 text-sm text-brand-600">
                      {l.city}, {l.state} {l.zip} · {SPECIALTY_LABELS[l.specialty] ?? l.specialty}
                    </p>
                    <p className="mt-1 text-sm text-brand-600">
                      {l.phone} · {l.email}
                    </p>
                    {l.budget_min || l.budget_max ? (
                      <p className="mt-1 text-xs text-brand-500">
                        Budget: {MONEY(l.budget_min)}
                        {l.budget_max ? ` – ${MONEY(l.budget_max)}` : ""}
                      </p>
                    ) : null}
                    {l.notes ? <p className="mt-1 text-xs italic text-brand-500">“{l.notes}”</p> : null}

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-brand-400">
                      <span>Received {DATE(l.created_at)}</span>
                      <span>Source: {l.source}</span>
                      <span>
                        Assigned to{" "}
                        {l.agent_first_name ? `${l.agent_first_name} ${l.agent_last_name ?? ""}`.trim() : "you"}
                      </span>
                      {l.appointment_at ? (
                        <span>
                          {l.appointment_type ?? "Appointment"} {DATETIME(l.appointment_at)}
                        </span>
                      ) : null}
                      {l.response_due_at && !l.first_response_at ? (
                        <span className={missed ? "font-semibold text-rose-600" : ""}>
                          Respond by {DATETIME(l.response_due_at)}
                        </span>
                      ) : null}
                      {l.first_response_at ? <span>First response {DATETIME(l.first_response_at)}</span> : null}
                    </div>
                  </div>

                  <div className="w-full shrink-0 lg:w-56">
                    <LeadActions leadId={l.id} currentStatus={l.status} />
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </Container>
  );
}
