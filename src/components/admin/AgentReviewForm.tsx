"use client";

import { useActionState } from "react";
import { reviewAgentAction } from "@/lib/actions/admin";
import { FormError, Label, Select } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function AgentReviewForm({
  userId,
  status,
  licenseVerified,
  marketApproved,
}: {
  userId: number;
  status: string;
  licenseVerified: number;
  marketApproved: number;
}) {
  const [state, action] = useActionState(reviewAgentAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="userId" value={userId} />
      <div>
        <Label>Account Status</Label>
        <Select name="status" defaultValue={status}>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Verification</Label>
        <label className="flex items-center gap-3 rounded-xl border border-brand-200 p-3">
          <input type="hidden" name="license_verified" value={licenseVerified} />
          <input type="checkbox" defaultChecked={licenseVerified === 1} onChange={(e) => { (e.currentTarget.previousElementSibling as HTMLInputElement).value = e.target.checked ? "1" : "0"; }} className="h-4 w-4 accent-brand-950" />
          <span className="text-sm text-brand-700">License verified</span>
        </label>
        <label className="flex items-center gap-3 rounded-xl border border-brand-200 p-3">
          <input type="hidden" name="market_approved" value={marketApproved} />
          <input type="checkbox" defaultChecked={marketApproved === 1} onChange={(e) => { (e.currentTarget.previousElementSibling as HTMLInputElement).value = e.target.checked ? "1" : "0"; }} className="h-4 w-4 accent-brand-950" />
          <span className="text-sm text-brand-700">Market approved</span>
        </label>
      </div>
      <FormError message={state?.error} />
      <SubmitButton className="w-full bg-brand-950 text-white hover:bg-brand-800">Save Review</SubmitButton>
    </form>
  );
}
