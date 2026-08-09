"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reassignLeadAction, autoAssignLeadAction, unassignLeadAction } from "@/lib/actions/admin";
import { FormError, Label, Select } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function AssignmentControls({
  leadId,
  agents,
  currentAgentId,
}: {
  leadId: number;
  agents: Array<{ id: number; label: string }>;
  currentAgentId: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const run = async (act: (fd: FormData) => Promise<{ ok?: boolean; error?: string } | void>, fd: FormData) => {
    startTransition(async () => {
      const res = await act(fd);
      if (res && "error" in res) {
        setError(String(res.error));
        return;
      }
      setError("");
      router.refresh();
    });
  };

  const wrap = (act: (prev: unknown, fd: FormData) => Promise<{ ok?: boolean; error?: string } | void>) =>
    (fd: FormData) => act(null, fd);

  return (
    <div className="space-y-3">
      <form
        action={(fd) => run(wrap(reassignLeadAction), fd)}
        className="space-y-2"
      >
        <input type="hidden" name="leadId" value={leadId} />
        <div>
          <Label>Assign to agent</Label>
          <Select name="agentId" defaultValue={currentAgentId ?? undefined}>
            <option value="">Select agent…</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </Select>
        </div>
        <SubmitButton className="w-full bg-brand-950 text-white hover:bg-brand-800" pendingText="Assigning…">
          Assign Agent
        </SubmitButton>
      </form>
      <div className="flex gap-2">
        <form action={(fd) => run(wrap(autoAssignLeadAction), fd)} className="flex-1">
          <input type="hidden" name="leadId" value={leadId} />
          <SubmitButton className="w-full bg-accent-500 text-brand-950 hover:bg-accent-400" pendingText="Matching…">
            Auto-Match Best Agent
          </SubmitButton>
        </form>
        <form action={(fd) => run(wrap(unassignLeadAction), fd)}>
          <input type="hidden" name="leadId" value={leadId} />
          <SubmitButton className="w-full bg-brand-50 text-brand-700 hover:bg-brand-100" pendingText="…">
            Unassign
          </SubmitButton>
        </form>
      </div>
      <FormError message={error} />
      {pending ? <p className="text-xs text-brand-400">Working…</p> : null}
    </div>
  );
}
