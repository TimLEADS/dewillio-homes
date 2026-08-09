"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/lib/actions/auth";
import { FormError, Input, Label } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, undefined);

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label>Email</Label>
        <Input name="email" type="email" required autoComplete="email" placeholder="you@brokerage.com" />
      </div>
      <div>
        <Label>Password</Label>
        <Input name="password" type="password" required autoComplete="current-password" placeholder="••••••••" />
      </div>
      <FormError message={state?.error} />
      <SubmitButton className="w-full bg-brand-950 text-white hover:bg-brand-800">
        Log in
      </SubmitButton>
      <p className="pt-2 text-center text-sm text-brand-600">
        New here?{" "}
        <Link href="/join" className="font-semibold text-brand-900 underline">
          Activate for $1
        </Link>
      </p>
    </form>
  );
}
