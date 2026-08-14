"use client";

import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";

/**
 * Without an error boundary a failed server render — a database timeout, a
 * cold-start blip — leaves the router with nothing to swap in, and the screen
 * simply never changes. This turns that silent hang into something the user can
 * see and retry.
 */
export function RouteError({
  error,
  reset,
  area,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  area: string;
}) {
  useEffect(() => {
    console.error(`[${area}] render failed`, error.digest ?? "", error.message);
  }, [area, error]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-600/20">
        <TriangleAlert size={22} />
      </span>
      <h2 className="mt-5 font-serif text-xl font-bold text-brand-950">This page didn&apos;t load</h2>
      <p className="mt-2 text-sm leading-relaxed text-brand-500">
        The server took too long or lost its database connection. Nothing was lost — try again.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
        >
          <RotateCw size={15} />
          Try again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg border border-brand-200 px-4 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:border-brand-300"
        >
          Reload page
        </button>
      </div>
      {error.digest ? <p className="mt-5 text-[11px] text-brand-400">Reference: {error.digest}</p> : null}
    </div>
  );
}
