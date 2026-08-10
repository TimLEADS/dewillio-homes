import type { Metadata } from "next";

/**
 * Where `src/proxy.ts` sends every request while DATABASE_URL is missing.
 *
 * Deliberately outside the (site) route group: that layout renders <Header />,
 * which reads the session out of the database — so it would throw on exactly
 * the misconfiguration this page exists to explain. Nothing here touches the
 * database, the session, or any environment variable.
 */
export const metadata: Metadata = {
  title: "Setup required — Dewilio Homes",
  robots: { index: false, follow: false },
};

const VERCEL_STEPS = [
  "Open the project on Vercel, then Storage → Create Database → Neon and attach it. DATABASE_URL is added to the project for you.",
  "Check Settings → Environment Variables shows DATABASE_URL with Production ticked.",
  "Go to Deployments, open the newest one and choose Redeploy. Environment variables are bound when a deployment is created, so the build already sitting there cannot see the new value.",
];

const LOCAL_STEPS = [
  "Copy .env.example to .env.local and paste your Neon connection string, or run `npm run dev:db` for a local database and use the two values it prints.",
  "Restart `npm run dev` so the new environment is picked up.",
];

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="mt-4 space-y-3">
      {items.map((step, i) => (
        <li key={i} className="flex gap-3 text-sm leading-relaxed text-brand-700">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
            {i + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

export default function SetupPage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">Setup required</p>
      <h1 className="mt-3 font-serif text-3xl font-bold text-brand-950">
        This site has no database yet.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-brand-500">
        Every page is being held here because <code className="font-mono text-brand-700">DATABASE_URL</code>{" "}
        is not set, so nothing can be read or written. The application is deployed and healthy —
        it just has nowhere to store anything. Setting the variable is the only step left; the
        schema and its demo data are created automatically on the first request afterwards.
      </p>

      <section className="mt-10 rounded-xl border border-brand-100 bg-white p-6">
        <h2 className="font-serif text-lg font-bold text-brand-950">On Vercel</h2>
        <Steps items={VERCEL_STEPS} />
      </section>

      <section className="mt-6 rounded-xl border border-brand-100 bg-white p-6">
        <h2 className="font-serif text-lg font-bold text-brand-950">Running locally</h2>
        <Steps items={LOCAL_STEPS} />
      </section>

      <p className="mt-8 text-xs leading-relaxed text-brand-400">
        Use Neon&rsquo;s pooled connection string — the host has{" "}
        <code className="font-mono">-pooler</code> in it. Leave{" "}
        <code className="font-mono">PGLITE_WS_PROXY</code> unset anywhere other than your own
        machine; it redirects the driver at a local development database.
      </p>
    </main>
  );
}
