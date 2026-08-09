"use client";

import { useActionState, useState } from "react";
import { createTransactionAction } from "@/lib/actions/admin";
import { FormError, Input, Label, Select } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function CreateTransactionForm({
  leadId,
  agentId,
  clientName,
}: {
  leadId: number;
  agentId: number;
  clientName: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(createTransactionAction, undefined);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-semibold text-brand-950 hover:bg-accent-400"
      >
        + Record Transaction
      </button>
    );
  }

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-brand-200 bg-brand-50/60 p-5">
      <h3 className="font-bold text-brand-950">Record Transaction</h3>
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="agent_id" value={agentId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Client Name</Label>
          <Input name="client_name" defaultValue={clientName} required />
        </div>
        <div>
          <Label>Property Address</Label>
          <Input name="property_address" required />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label>Estimated Value ($)</Label>
          <Input name="estimated_value" type="number" min={0} required />
        </div>
        <div>
          <Label>Gross Commission ($)</Label>
          <Input name="gross_commission" type="number" min={0} required />
        </div>
        <div>
          <Label>Status</Label>
          <Select name="status" defaultValue="pending">
            <option value="pending">Pending</option>
            <option value="under_contract">Under Contract</option>
            <option value="closed">Closed</option>
          </Select>
        </div>
      </div>
      <p className="text-xs text-brand-500">The 20% referral fee is calculated automatically from gross commission.</p>
      <FormError message={state?.error} />
      <SubmitButton className="bg-brand-950 text-white hover:bg-brand-800">Save Transaction</SubmitButton>
    </form>
  );
}
