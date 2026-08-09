import { agentAppointments } from "@/lib/queries";
import { requireAgent } from "@/lib/auth";
import { AppointmentStatus } from "@/components/dashboard/AppointmentStatus";
import { Badge, Card, Container } from "@/components/ui";
import { DATETIME } from "@/lib/constants";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-amber-100 text-amber-800 ring-amber-600/20",
  completed: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  rescheduled: "bg-sky-100 text-sky-800 ring-sky-600/20",
  cancelled: "bg-rose-100 text-rose-800 ring-rose-600/20",
};

export default async function AgentAppointmentsPage() {
  const user = await requireAgent();
  const appointments = await agentAppointments(user.id);

  return (
    <Container className="!px-0">
      <h1 className="font-serif text-2xl font-bold text-brand-950">Appointments</h1>
      <p className="mt-1 text-sm text-brand-500">Calls, showings and meetings with your leads.</p>

      <div className="mt-6 space-y-3">
        {appointments.length === 0 ? (
          <Card>
            <p className="text-sm text-brand-500">No appointments yet. Add one from a lead.</p>
          </Card>
        ) : (
          appointments.map((a) => (
            <Card key={a.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-brand-950">{a.lead_first_name} {a.lead_last_name}</p>
                <p className="text-sm text-brand-600">{DATETIME(a.scheduled_at)} · {a.type}</p>
                {a.notes ? <p className="mt-1 text-xs italic text-brand-500">“{a.notes}”</p> : null}
              </div>
              <div className="flex items-center gap-3">
                <Badge className={STATUS_STYLE[a.status] ?? "bg-brand-100 text-brand-700 ring-brand-600/20"}>{a.status}</Badge>
                <AppointmentStatus id={a.id} status={a.status} />
              </div>
            </Card>
          ))
        )}
      </div>
    </Container>
  );
}
