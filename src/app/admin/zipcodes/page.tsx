import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { AddZipForm } from "@/components/admin/AddZipForm";
import { toggleZipAction, deleteZipAction } from "@/lib/actions/admin";
import { Badge, Card, Container } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminZipcodesPage() {
  await requireAdmin();
  const db = getDb();
  const zips = await db.prepare("SELECT * FROM zip_codes ORDER BY zip").all() as Array<Record<string, unknown>>;

  return (
    <Container className="!px-0">
      <h1 className="font-serif text-2xl font-bold text-brand-950">ZIP Codes</h1>
      <p className="mt-1 text-sm text-brand-500">
        Manage service ZIPs. Agents list these as their service areas for lead matching.
      </p>

      <Card className="mt-6">
        <h2 className="mb-4 font-bold text-brand-950">Add ZIP Code</h2>
        <AddZipForm />
      </Card>

      <Card className="mt-6 !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-xs uppercase tracking-wider text-brand-400">
                <th className="px-5 py-3">ZIP</th>
                <th className="px-5 py-3">City</th>
                <th className="px-5 py-3">State</th>
                <th className="px-5 py-3">Market</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {zips.map((z) => (
                <tr key={z.id as number} className="border-b border-brand-50">
                  <td className="px-5 py-3 font-semibold text-brand-950">{z.zip as string}</td>
                  <td className="px-5 py-3 text-brand-700">{z.city as string}</td>
                  <td className="px-5 py-3 text-brand-700">{z.state as string}</td>
                  <td className="px-5 py-3 text-brand-700">{z.market as string}</td>
                  <td className="px-5 py-3">
                    {z.active === 1 ? (
                      <Badge className="bg-emerald-100 text-emerald-800 ring-emerald-600/20">Active</Badge>
                    ) : (
                      <Badge className="bg-brand-100 text-brand-700 ring-brand-600/20">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <form action={toggleZipAction}>
                        <input type="hidden" name="id" value={z.id as number} />
                        <button type="submit" className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">
                          {z.active === 1 ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                      <form action={deleteZipAction}>
                        <input type="hidden" name="id" value={z.id as number} />
                        <button type="submit" className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Container>
  );
}
