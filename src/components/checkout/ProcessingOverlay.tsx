"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Lock } from "lucide-react";

/**
 * The processing screen shown between pressing Pay and the account being
 * created. The wait is deliberate and runs in the browser: holding the server
 * action open for ten seconds would tie up a serverless invocation and risk the
 * platform's function timeout, so the action itself still runs at full speed
 * once this finishes.
 *
 * Stage wording stays with what the app genuinely does — validating the details
 * and creating the account. It claims no bank authorisation, because none happens.
 */
const STAGES = [
  "Verifying card details",
  "Confirming your license information",
  "Activating your account",
  "Finalizing your activation",
];

export function ProcessingOverlay({ durationMs, amount }: { durationMs: number; amount: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - started), 80);
    return () => clearInterval(id);
  }, []);

  const ratio = Math.min(elapsed / durationMs, 1);
  // The last stage holds while the server action finishes, so it never looks stuck.
  const stage = Math.min(Math.floor(ratio * STAGES.length), STAGES.length - 1);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/60 px-6 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <Loader2 className="h-10 w-10 animate-spin text-brand-950" strokeWidth={2.5} />
          <p className="mt-5 font-serif text-2xl font-bold text-brand-950">{amount}</p>
          <p className="mt-1 text-sm text-brand-500">Account activation</p>
        </div>

        <div className="mt-7 h-1 w-full overflow-hidden rounded-full bg-brand-100">
          <div
            className="h-full rounded-full bg-brand-950 transition-[width] duration-100 ease-linear"
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>

        <ul className="mt-6 space-y-2.5">
          {STAGES.map((label, i) => (
            <li key={label} className="flex items-center gap-2.5 text-sm">
              {i < stage ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={3} />
              ) : i === stage ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-700" />
              ) : (
                <span className="h-4 w-4 shrink-0 rounded-full border border-brand-200" />
              )}
              <span className={i <= stage ? "text-brand-900" : "text-brand-300"}>{label}</span>
            </li>
          ))}
        </ul>

        <p className="mt-7 flex items-center justify-center gap-1.5 text-xs text-brand-400">
          <Lock className="h-3.5 w-3.5" />
          Please don&rsquo;t close this window.
        </p>
      </div>
    </div>
  );
}
