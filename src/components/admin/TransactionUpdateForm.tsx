"use client";

import { useActionState } from "react";
import { updateTransactionAction } from "@/lib/actions/admin";
import { FormError, Input, Label, Select } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function TransactionUpdateForm({
  tx,
}: {
  tx: {
    id: number;
    status: string;
    fee_status: string;
    gross_commission: number | null;
  };
}) {
  const [state, action] = useActionState(updateTransactionAction, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4">
      <input type="hidden" name="id" value={tx.id} />
      <div>
        <Label>Status</Label>
        <Select name="status" defaultValue={tx.status}>
          <option value="pending">Pending</option>
          <option value="under_contract">Under Contract</option>
          <option value="closed">Closed</option>
        </Select>
      </div>
      <div>
        <Label>Fee Status</Label>
        <Select name="fee_status" defaultValue={tx.fee_status}>
          <option value="pending">Pending</option>
          <option value="under_contract">Under Contract</option>
          <option value="closed_fee_due">Closed — Fee Due</option>
          <option value="paid">Paid</option>
          <option value="disputed">Disputed</option>
        </Select>
      </div>
      <div>
        <Label>Gross Commission</Label>
        <Input name="gross_commission" type="number" min={0} defaultValue={tx.gross_commission ?? 0} required />
      </div>
      <div className="flex items-end">
        <SubmitButton className="w-full bg-brand-950 text-white hover:bg-brand-800" pendingText="Saving…">
          Update
        </SubmitButton>
      </div>
      <div className="sm:col-span-4">
        <FormError message={state?.error} />
      </div>
    </form>
  );
}
