import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { activationDestination } from "@/lib/activation";
import { ActivationShell } from "@/components/activation/ActivationShell";
import { ActivationOtp } from "@/components/activation/ActivationOtp";

export const dynamic = "force-dynamic";

/** j•••@brokerage.com — enough to recognise, nothing to leak. */
function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  return `${name.slice(0, 1)}${"•".repeat(Math.max(name.length - 1, 2))}@${domain}`;
}

export default async function ActivationOtpPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "agent") redirect("/admin");

  const row = (await getDb()
    .prepare("SELECT activation_stage FROM users WHERE id = ?")
    .get(user.id)) as { activation_stage: string | null } | undefined;
  const stage = row?.activation_stage ?? "approved";
  if (stage !== "otp") redirect(activationDestination(stage));

  return (
    <ActivationShell>
      <ActivationOtp hint={maskEmail(user.email)} />
    </ActivationShell>
  );
}
