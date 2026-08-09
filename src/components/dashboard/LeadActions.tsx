"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { updateLeadStatusAction, addAppointmentAction } from "@/lib/actions/agent";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/constants";
import { FormError, Input, Label, Select } from "@/components/ui";

export function LeadActions({ leadId, currentStatus }: { leadId: number; currentStatus: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [showAppt, setShowAppt] = useState(false);
  const [apptScheduled, setApptScheduled] = useState("");
  const [apptType, setApptType] = useState("call");
  const [apptNotes, setApptNotes] = useState("");

  const updateStatus = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value;
    if (status === currentStatus) return;
    const fd = new FormData();
    fd.set("leadId", String(leadId));
    fd.set("status", status);
    startTransition(async () => {
      const res = await updateLeadStatusAction(undefined, fd);
      if (res?.error) setError(res.error);
      router.refresh();
    });
  };

  const addAppt = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.set("leadId", String(leadId));
    fd.set("scheduledAt", apptScheduled);
    fd.set("type", apptType);
    fd.set("notes", apptNotes);
    startTransition(async () => {
      const res = await addAppointmentAction(undefined, fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setShowAppt(false);
      setApptNotes("");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Select value={currentStatus} onChange={updateStatus} disabled={pending} className="w-40 py-1.5 text-xs">
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <button
          type="button"
          onClick={() => setShowAppt((v) => !v)}
          className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
        >
          <CalendarPlus size={14} /> Appointment
        </button>
      </div>
      {error ? <FormError message={error} /> : null}
      {showAppt ? (
        <form onSubmit={addAppt} className="space-y-2 rounded-lg border border-brand-100 bg-brand-50/60 p-3">
          <div>
            <Label>Date & Time</Label>
            <Input type="datetime-local" required value={apptScheduled} onChange={(e) => setApptScheduled(e.target.value)} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={apptType} onChange={(e) => setApptType(e.target.value)}>
              <option value="call">Call</option>
              <option value="showing">Showing</option>
              <option value="listing_appointment">Listing Appointment</option>
              <option value="meeting">Meeting</option>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Input
              placeholder="Optional — what to prepare"
              value={apptNotes}
              onChange={(e) => setApptNotes(e.target.value)}
            />
          </div>
          <button type="submit" disabled={pending} className="w-full rounded-lg bg-brand-950 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-50">
            {pending ? "Saving…" : "Schedule Appointment"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
