"use client";

import { useActionState, useState } from "react";
import { changePasswordAction, updateNotificationSettingsAction } from "@/lib/actions/agent";
import { FormError, Input, Label } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <Label>Current Password</Label>
        <Input name="current" type="password" required autoComplete="current-password" />
      </div>
      <div>
        <Label>New Password</Label>
        <Input name="next" type="password" required autoComplete="new-password" />
      </div>
      <FormError message={state?.error} />
      <SubmitButton className="bg-brand-950 text-white hover:bg-brand-800">Update Password</SubmitButton>
    </form>
  );
}

export function NotificationSettingsForm({
  notifyEmail,
  notifySms,
}: {
  notifyEmail: number;
  notifySms: number;
}) {
  const [state, action] = useActionState(updateNotificationSettingsAction, undefined);
  const [email, setEmail] = useState(notifyEmail === 1);
  const [sms, setSms] = useState(notifySms === 1);
  return (
    <form action={action} className="space-y-4">
      <label className="flex items-center justify-between rounded-xl border border-brand-200 p-4">
        <span className="text-sm text-brand-700">Email notifications</span>
        <input type="hidden" name="notify_email" value={email ? "1" : "0"} />
        <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="h-4 w-4 accent-brand-950" />
      </label>
      <label className="flex items-center justify-between rounded-xl border border-brand-200 p-4">
        <span className="text-sm text-brand-700">SMS notifications</span>
        <input type="hidden" name="notify_sms" value={sms ? "1" : "0"} />
        <input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} className="h-4 w-4 accent-brand-950" />
      </label>
      <FormError message={state?.error} />
      <SubmitButton className="bg-brand-950 text-white hover:bg-brand-800">Save Preferences</SubmitButton>
    </form>
  );
}
