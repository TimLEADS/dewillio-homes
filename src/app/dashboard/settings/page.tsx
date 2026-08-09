import { requireAgent } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { PasswordForm, NotificationSettingsForm } from "@/components/dashboard/SettingsForms";
import { Card, Container } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AgentSettingsPage() {
  const user = await requireAgent();
  const db = getDb();
  const settings = await db
    .prepare("SELECT notify_email, notify_sms FROM user_settings WHERE user_id = ?")
    .get(user.id) as { notify_email: number; notify_sms: number } | undefined;

  return (
    <Container className="!px-0">
      <h1 className="font-serif text-2xl font-bold text-brand-950">Settings</h1>
      <p className="mt-1 text-sm text-brand-500">Password and notification preferences.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-bold text-brand-950">Change Password</h2>
          <PasswordForm />
        </Card>
        <Card>
          <h2 className="mb-4 font-bold text-brand-950">Notifications</h2>
          <NotificationSettingsForm
            notifyEmail={settings?.notify_email ?? 1}
            notifySms={settings?.notify_sms ?? 1}
          />
        </Card>
      </div>
    </Container>
  );
}
