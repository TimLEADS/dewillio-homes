"use client";

import { useActionState } from "react";
import { sendAdminNotificationAction } from "@/lib/actions/admin";
import { FormError, Input, Label, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function SendNotificationForm({ userId }: { userId: number }) {
  const [state, action] = useActionState(sendAdminNotificationAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <div>
        <Label>Title</Label>
        <Input name="title" required placeholder="e.g. Account approved" />
      </div>
      <div>
        <Label>Message</Label>
        <Textarea name="body" rows={3} required placeholder="Message to the agent…" />
      </div>
      <FormError message={state?.error} />
      <SubmitButton className="bg-brand-950 text-white hover:bg-brand-800">Send Notification</SubmitButton>
    </form>
  );
}
