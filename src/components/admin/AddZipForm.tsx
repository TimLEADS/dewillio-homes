"use client";

import { useActionState } from "react";
import { addZipAction } from "@/lib/actions/admin";
import { STATES } from "@/lib/constants";
import { FormError, Input, Label, Select } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function AddZipForm() {
  const [state, action] = useActionState(addZipAction, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-5">
      <div>
        <Label>ZIP</Label>
        <Input name="zip" required />
      </div>
      <div>
        <Label>City</Label>
        <Input name="city" required />
      </div>
      <div>
        <Label>State</Label>
        <Select name="state" required defaultValue="">
          <option value="" disabled>Select</option>
          {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>
      <div>
        <Label>Market</Label>
        <Input name="market" defaultValue="general" required />
      </div>
      <div className="flex items-end">
        <SubmitButton className="w-full bg-brand-950 text-white hover:bg-brand-800">Add</SubmitButton>
      </div>
      <div className="sm:col-span-5">
        <FormError message={state?.error} />
      </div>
    </form>
  );
}
