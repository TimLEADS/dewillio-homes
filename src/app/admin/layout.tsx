import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();
  const db = getDb();
  const unreadRow = await db
    .prepare("SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read_at IS NULL")
    .get(user.id) as { c: number };
  const queueRow = await db
    .prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'agent' AND activation_stage IN ('waiting','otp','otp_verified','app_approval')")
    .get() as { c: number };

  const name = user.email;
  return (
    <DashboardShell role="admin" name={name} email={user.email} unread={unreadRow.c} activationQueue={queueRow.c}>
      {children}
    </DashboardShell>
  );
}
