"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAppointmentStatusAction } from "@/lib/actions/agent";
import { Select } from "@/components/ui";

export function AppointmentStatus({ id, status }: { id: number; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fd = new FormData();
    fd.set("id", String(id));
    fd.set("status", e.target.value);
    startTransition(async () => {
      await updateAppointmentStatusAction(undefined, fd);
      router.refresh();
    });
  };

  return (
    <Select value={status} onChange={onChange} disabled={pending} className="w-36 py-1.5 text-xs">
      <option value="scheduled">Scheduled</option>
      <option value="completed">Completed</option>
      <option value="rescheduled">Rescheduled</option>
      <option value="cancelled">Cancelled</option>
    </Select>
  );
}
