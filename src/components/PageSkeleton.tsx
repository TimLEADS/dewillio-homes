/**
 * Placeholder shown while a dashboard or admin route streams in. Its presence
 * as `loading.tsx` is what turns those force-dynamic pages from a blocking
 * navigation — where the browser sits on the old screen until every query has
 * returned — into one that paints immediately.
 */
export function PageSkeleton({ stats = 6, panels = 2 }: { stats?: number; panels?: number }) {
  return (
    <div className="animate-pulse" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      <div className="h-7 w-56 rounded-lg bg-brand-100" />
      <div className="mt-2 h-4 w-72 rounded bg-brand-100/70" />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: stats }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-brand-100 bg-white p-5">
            <div className="h-3.5 w-24 rounded bg-brand-100" />
            <div className="mt-3 h-7 w-16 rounded-lg bg-brand-100" />
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {Array.from({ length: panels }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-brand-100 bg-white p-5">
            <div className="h-4 w-32 rounded bg-brand-100" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((__, j) => (
                <div key={j} className="h-14 rounded-xl border border-brand-100 bg-brand-50/60" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
