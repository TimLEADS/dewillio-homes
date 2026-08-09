import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Badge, Card, Container } from "@/components/ui";
import { DATETIME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requireAdmin();
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT a.*, u.email AS actor_email
       FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
       ORDER BY a.created_at DESC LIMIT 200`
    )
    .all() as Array<Record<string, unknown>>;

  return (
    <Container className="!px-0">
      <h1 className="font-serif text-2xl font-bold text-brand-950">Audit Log</h1>
      <p className="mt-1 text-sm text-brand-500">
        Every assignment, review, payment and status change — with actor and details.
      </p>

      <Card className="mt-6 !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-xs uppercase tracking-wider text-brand-400">
                <th className="px-5 py-3">When</th>
                <th className="px-5 py-3">Actor</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Entity</th>
                <th className="px-5 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id as number} className="border-b border-brand-50">
                  <td className="whitespace-nowrap px-5 py-3 text-brand-500">{DATETIME(r.created_at as string)}</td>
                  <td className="px-5 py-3 text-brand-700">
                    {r.actor_email as string ?? "system"}
                    <span className="block text-xs text-brand-400">{r.actor_role as string ?? ""}</span>
                  </td>
                  <td className="px-5 py-3">
                    <Badge className="bg-brand-100 text-brand-700 ring-brand-600/20">{r.action as string}</Badge>
                  </td>
                  <td className="px-5 py-3 text-brand-700">
                    {r.entity as string}{r.entity_id ? ` #${r.entity_id}` : ""}
                  </td>
                  <td className="max-w-md px-5 py-3 text-xs text-brand-500">{r.details as string ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Container>
  );
}
