import Link from "next/link";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { activateAgreementAction } from "@/lib/actions/admin";
import { PublishAgreementForm } from "@/components/admin/PublishAgreementForm";
import { Badge, Card, Container, StatCard } from "@/components/ui";
import { DATE, DATETIME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminAgreementsPage() {
  const admin = await requireAdmin();
  const db = getDb();

  const versions = await db
    .prepare(`SELECT * FROM agreement_versions ORDER BY active DESC, id DESC`)
    .all() as Array<{
    id: number;
    version: string;
    title: string;
    body: string;
    referral_rate: number;
    effective_date: string;
    active: number;
    created_at: string;
  }>;

  const active = versions.find((v) => v.active === 1);

  const agents = await db
    .prepare(
      `SELECT u.id, u.email, u.status, u.agreement_version, u.agreement_accepted_at,
              p.first_name, p.last_name
       FROM users u LEFT JOIN agent_profiles p ON p.user_id = u.id
       WHERE u.role = 'agent'
       ORDER BY u.created_at DESC`
    )
    .all() as Array<Record<string, unknown>>;

  const accepted = agents.filter((a) => a.agreement_accepted_at && a.agreement_version === active?.version);
  const stale = agents.filter((a) => a.agreement_accepted_at && a.agreement_version !== active?.version);
  const never = agents.filter((a) => !a.agreement_accepted_at);

  const bumpVersion = (v: string | undefined): string => {
    if (!v) return "1.1";
    const parts = v.split(".");
    const minor = Number(parts[1] ?? 0);
    return Number.isFinite(minor) ? `${parts[0]}.${minor + 1}` : v + ".1";
  };

  return (
    <Container className="!px-0">
      <h1 className="font-serif text-2xl font-bold text-brand-950">Referral Agreements</h1>
      <p className="mt-1 text-sm text-brand-500">
        Publish agreement versions and track which agents have accepted the current one.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Version" value={active?.version ?? "—"} sub={active ? DATE(active.effective_date) : "None published"} />
        <StatCard label="Accepted (current)" value={accepted.length} sub={`of ${agents.length} agents`} />
        <StatCard label="Needs Re-Acceptance" value={stale.length} sub="Accepted an older version" />
        <StatCard label="Never Accepted" value={never.length} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-bold text-brand-950">Publish New Version</h2>
          <PublishAgreementForm
            currentBody={active?.body ?? ""}
            nextVersion={bumpVersion(active?.version)}
            canPublish={admin.role === "super_admin"}
          />
        </Card>

        <Card>
          <h2 className="mb-4 font-bold text-brand-950">Version History</h2>
          {versions.length === 0 ? (
            <p className="text-sm text-brand-500">No agreement versions published.</p>
          ) : (
            <div className="space-y-2">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className={`rounded-xl border p-4 ${v.active ? "border-accent-300 bg-accent-50/40" : "border-brand-100"}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-brand-950">
                        v{v.version}{" "}
                        <span className="text-sm font-normal text-brand-500">— {v.title}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-brand-400">
                        {Math.round(v.referral_rate * 100)}% referral fee · effective {DATE(v.effective_date)} ·
                        published {DATE(v.created_at)}
                      </p>
                    </div>
                    {v.active ? (
                      <Badge className="bg-emerald-100 text-emerald-800 ring-emerald-600/20">Active</Badge>
                    ) : admin.role === "super_admin" ? (
                      <form action={activateAgreementAction}>
                        <input type="hidden" name="id" value={v.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                        >
                          Make active
                        </button>
                      </form>
                    ) : (
                      <Badge className="bg-brand-100 text-brand-700 ring-brand-600/20">Archived</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-6 !p-0">
        <div className="px-5 py-4">
          <h2 className="font-bold text-brand-950">Agent Acceptance</h2>
          <p className="text-xs text-brand-400">
            Agents on an older version are prompted to re-accept before their next referral.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-y border-brand-100 text-xs uppercase tracking-wider text-brand-400">
                <th className="px-5 py-3">Agent</th>
                <th className="px-5 py-3">Account</th>
                <th className="px-5 py-3">Accepted Version</th>
                <th className="px-5 py-3">Accepted On</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-sm text-brand-500">
                    No agents yet.
                  </td>
                </tr>
              ) : (
                agents.map((a) => {
                  const isCurrent = a.agreement_accepted_at && a.agreement_version === active?.version;
                  return (
                    <tr key={a.id as number} className="border-b border-brand-50 hover:bg-brand-50/40">
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/agents/${a.id}`}
                          className="font-semibold text-brand-950 hover:underline"
                        >
                          {String(a.first_name ?? "Unknown")} {String(a.last_name ?? "")}
                        </Link>
                        <p className="text-xs text-brand-500">{a.email as string}</p>
                      </td>
                      <td className="px-5 py-3 text-brand-700">{a.status as string}</td>
                      <td className="px-5 py-3 text-brand-700">{String(a.agreement_version ?? "—")}</td>
                      <td className="px-5 py-3 text-brand-500">
                        {a.agreement_accepted_at ? DATETIME(a.agreement_accepted_at as string) : "—"}
                      </td>
                      <td className="px-5 py-3">
                        {isCurrent ? (
                          <Badge className="bg-emerald-100 text-emerald-800 ring-emerald-600/20">Current</Badge>
                        ) : a.agreement_accepted_at ? (
                          <Badge className="bg-amber-100 text-amber-800 ring-amber-600/20">Outdated</Badge>
                        ) : (
                          <Badge className="bg-rose-100 text-rose-800 ring-rose-600/20">Not accepted</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </Container>
  );
}
