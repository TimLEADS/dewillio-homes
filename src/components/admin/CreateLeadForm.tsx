"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createLeadAction } from "@/lib/actions/admin";
import { SPECIALTIES, STATES } from "@/lib/constants";
import { FormError, Input, Label, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function CreateLeadForm() {
  const [auto, setAuto] = useState(true);
  const [state, action] = useActionState(createLeadAction, undefined);

  if (state?.ok) {
    return (
      <div className="rounded-xl bg-emerald-50 p-5">
        <p className="font-bold text-emerald-900">Lead created</p>
        <p className="mt-1 text-sm text-emerald-700">
          The lead was added {auto ? "and auto-assigned to the best-matching agent." : "to the lead pool without assignment."}
        </p>
        <Link href={`/admin/leads/${state.leadId}`} className="mt-3 inline-block text-sm font-semibold text-emerald-900 underline">
          View lead →
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="auto_assign" value={auto ? "1" : "0"} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>First Name</Label>
          <Input name="first_name" required />
        </div>
        <div>
          <Label>Last Name</Label>
          <Input name="last_name" required />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Email</Label>
          <Input name="email" type="email" required />
        </div>
        <div>
          <Label>Phone</Label>
          <Input name="phone" required />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label>Lead Type</Label>
          <Select name="lead_type" defaultValue="buyer">
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
          </Select>
        </div>
        <div>
          <Label>Specialty</Label>
          <Select name="specialty" defaultValue="general">
            {SPECIALTIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </div>
        <div>
          <Label>Source</Label>
          <Select name="source" defaultValue="website">
            <option value="website">Website</option>
            <option value="referral">Referral</option>
            <option value="crm">CRM</option>
            <option value="other">Other</option>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
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
          <Label>ZIP</Label>
          <Input name="zip" required />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Budget Min ($)</Label>
          <Input name="budget_min" type="number" min={0} />
        </div>
        <div>
          <Label>Budget Max ($)</Label>
          <Input name="budget_max" type="number" min={0} />
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea name="notes" rows={3} />
      </div>
      <label className="flex items-center gap-3 rounded-xl border border-brand-200 p-4">
        <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="h-4 w-4 accent-brand-950" />
        <span className="text-sm text-brand-700">
          Auto-assign to the best-matching eligible agent (ZIP, type, specialty, availability, capacity, response performance)
        </span>
      </label>
      <FormError message={state?.error} />
      <SubmitButton className="bg-brand-950 text-white hover:bg-brand-800">Create Lead</SubmitButton>
    </form>
  );
}
