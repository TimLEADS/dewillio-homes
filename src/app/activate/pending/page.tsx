import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { activationDestination } from "@/lib/activation";
import { ActivationShell } from "@/components/activation/ActivationShell";
import { ActivationPending } from "@/components/activation/ActivationPending";

export const dynamic = "force-dynamic";

export default async function ActivationPendingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "agent") redirect("/admin");

  const row = (await getDb()
    .prepare("SELECT activation_stage FROM users WHERE id = ?")
    .get(user.id)) as { activation_stage: string | null } | undefined;
  const stage = row?.activation_stage ?? "approved";

  const dest = activationDestination(stage);
  if (dest !== "/activate/pending") redirect(dest);

  return (
    <ActivationShell>
      <ActivationPending initialStage={stage} />
    </ActivationShell>
  );
}
