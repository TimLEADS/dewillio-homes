import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { activationDestination } from "@/lib/activation";
import { ActivationShell } from "@/components/activation/ActivationShell";
import { ActivationApproved } from "@/components/activation/ActivationApproved";

export const dynamic = "force-dynamic";

export default async function ActivationApprovedPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "agent") redirect("/admin");

  const row = (await getDb()
    .prepare("SELECT activation_stage FROM users WHERE id = ?")
    .get(user.id)) as { activation_stage: string | null } | undefined;
  const stage = row?.activation_stage ?? "approved";
  if (stage !== "approved") redirect(activationDestination(stage));

  const profile = (await getDb()
    .prepare("SELECT first_name FROM agent_profiles WHERE user_id = ?")
    .get(user.id)) as { first_name: string | null } | undefined;
  const payment = (await getDb()
    .prepare("SELECT reference FROM activation_payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(user.id)) as { reference: string | null } | undefined;

  return (
    <ActivationShell>
      <ActivationApproved name={profile?.first_name ?? ""} reference={payment?.reference ?? null} />
    </ActivationShell>
  );
}
