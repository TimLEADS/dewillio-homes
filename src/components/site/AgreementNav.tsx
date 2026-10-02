"use client";

import { useEffect, useState } from "react";

type NavClause = { number: number; title: string; slug: string };

/**
 * Sticky clause navigator with scroll spy.
 *
 * Uses one IntersectionObserver over the clause headings rather than a scroll
 * listener, so tracking costs nothing while the page is idle.
 */
export function AgreementNav({ clauses }: { clauses: NavClause[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const headings = clauses
      .map((c) => document.getElementById(c.slug))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    const visible = new Set<string>();

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        // Topmost visible clause wins, so the marker never jumps backwards.
        const first = clauses.find((c) => visible.has(c.slug));
        if (first) setActive(first.slug);
      },
      // A band near the top of the viewport: a heading becomes "current" once it
      // passes under the sticky header.
      { rootMargin: "-140px 0px -65% 0px", threshold: 0 }
    );

    for (const h of headings) io.observe(h);
    return () => io.disconnect();
  }, [clauses]);

  return (
    <nav aria-label="Agreement clauses" className="print:hidden">
      <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-950">
        Clauses
      </p>
      <ol className="space-y-1 border-l border-brand-200">
        {clauses.map((c) => {
          const isActive = active === c.slug;
          return (
            <li key={c.slug}>
              <a
                href={`#${c.slug}`}
                aria-current={isActive ? "true" : undefined}
                className={`-ml-px flex gap-2.5 border-l-2 py-2 pl-4 text-sm leading-snug transition-all duration-300 ${
                  isActive
                    ? "border-accent-500 font-semibold text-brand-950"
                    : "border-transparent text-brand-500 hover:border-brand-300 hover:text-brand-900"
                }`}
              >
                <span className="font-display tabular-nums opacity-60">
                  {String(c.number).padStart(2, "0")}
                </span>
                <span className="font-semibold tracking-wide">{c.title}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}