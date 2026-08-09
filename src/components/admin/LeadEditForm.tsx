"use client";

import { useActionState } from "react";
import { updateLeadAction } from "@/lib/actions/admin";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, SPECIALTIES, STATES } from "@/lib/constants";
import { FormError, Input, Label, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function LeadEditForm({ lead }: { lead: Record<string, unknown> }) {
  const [state, action] = useActionState(updateLeadAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={lead.id as number} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>First Name</Label>
          <Input name="first_name" defaultValue={lead.first_name as string} required />
        </div>
        <div>
          <Label>Last Name</Label>
          <Input name="last_name" defaultValue={lead.last_name as string} required />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Email</Label>
          <Input name="email" type="email" defaultValue={lead.email as string} required />
        </div>
        <div>
          <Label>Phone</Label>
          <Input name="phone" defaultValue={lead.phone as string} required />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label>Lead Type</Label>
          <Select name="lead_type" defaultValue={lead.lead_type as string}>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
          </Select>
        </div>
        <div>
          <Label>Specialty</Label>
          <Select name="specialty" defaultValue={lead.specialty as string}>
            {SPECIALTIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select name="status" defaultValue={lead.status as string}>
            {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label>City</Label>
          <Input name="city" defaultValue={lead.city as string} required />
        </div>
        <div>
          <Label>State</Label>
          <Select name="state" defaultValue={lead.state as string} required>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div>
          <Label>ZIP</Label>
          <Input name="zip" defaultValue={lead.zip as string} required />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label>Budget Min ($)</Label>
          <Input name="budget_min" type="number" min={0} defaultValue={lead.budget_min as number | undefined} />
        </div>
        <div>
          <Label>Budget Max ($)</Label>
          <Input name="budget_max" type="number" min={0} defaultValue={lead.budget_max as number | undefined} />
        </div>
        <div>
          <Label>Source</Label>
          <Select name="source" defaultValue={lead.source as string}>
            <option value="website">Website</option>
            <option value="referral">Referral</option>
            <option value="crm">CRM</option>
            <option value="other">Other</option>
          </Select>
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea name="notes" rows={3} defaultValue={lead.notes as string | undefined} />
      </div>
      <FormError message={state?.error} />
      <SubmitButton className="bg-brand-950 text-white hover:bg-brand-800">Save Changes</SubmitButton>
    </form>
  );
}
