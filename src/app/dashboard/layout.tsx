import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { requireAgent } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

/** Private to the signed-in agent — never a search result. See the admin layout. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await requireAgent();
  const db = getDb();
  const unreadRow = await db
    .prepare("SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read_at IS NULL")
    .get(user.id) as { c: number };

  const name = user.profile ? `${user.profile.first_name} ${user.profile.last_name}` : user.email;
  return (
    <DashboardShell role="agent" name={name} email={user.email} unread={unreadRow.c}>
      {children}
    </DashboardShell>
  );
}
