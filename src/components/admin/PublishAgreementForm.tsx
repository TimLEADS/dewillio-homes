"use client";

import { useActionState } from "react";
import { publishAgreementAction } from "@/lib/actions/admin";
import { FormError, FormSuccess, Input, Label, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function PublishAgreementForm({
  currentBody,
  nextVersion,
  canPublish,
}: {
  currentBody: string;
  nextVersion: string;
  canPublish: boolean;
}) {
  const [state, action] = useActionState(publishAgreementAction, undefined);

  if (!canPublish) {
    return (
      <p className="rounded-lg bg-brand-50 px-3 py-2.5 text-sm text-brand-600">
        Only a super admin can publish a new referral agreement version.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label>Version</Label>
          <Input name="version" defaultValue={nextVersion} required />
        </div>
        <div>
          <Label>Referral Rate (%)</Label>
          <Input name="referral_rate" type="number" min={0} max={100} step="0.5" defaultValue={20} required />
        </div>
        <div>
          <Label>Effective Date</Label>
          <Input name="effective_date" type="date" required />
        </div>
      </div>
      <div>
        <Label>Title</Label>
        <Input name="title" defaultValue="Dewilio Homes Referral Agreement" required />
      </div>
      <div>
        <Label>Agreement Body</Label>
        <Textarea name="body" rows={12} defaultValue={currentBody} required />
      </div>
      <FormError message={state?.error} />
      {state?.ok ? <FormSuccess message="New agreement version published. Agents have been notified." /> : null}
      <SubmitButton className="bg-brand-950 text-white hover:bg-brand-800" pendingText="Publishing…">
        Publish New Version
      </SubmitButton>
    </form>
  );
}
