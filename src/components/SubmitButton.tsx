"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

/** Label switches at SLOW_MS; a manual escape appears at STUCK_MS. */
const SLOW_MS = 8000;
const STUCK_MS = 20000;

/**
 * `useFormStatus` is kept deliberately: these forms submit to server actions
 * that finish with `redirect()`, and `redirect()` works by throwing a sentinel
 * that a hand-rolled try/catch around the action would swallow. So pending
 * state stays owned by the form — what is added here is an exit. A submit that
 * never settles used to leave a disabled button reading "Saving…" forever, with
 * no way out but a manual refresh the user had no reason to expect.
 */
export function SubmitButton({
  children,
  pendingText = "Saving…",
  className = "",
  formAction,
  disabled = false,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
  /** Held shut by the caller — e.g. a form the entered data can't yet satisfy. */
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const [phase, setPhase] = useState<"idle" | "slow" | "stuck">("idle");

  useEffect(() => {
    if (!pending) return;
    const slow = setTimeout(() => setPhase("slow"), SLOW_MS);
    const stuck = setTimeout(() => setPhase("stuck"), STUCK_MS);
    // Reset on the way out, so the next submit starts from "idle" again.
    return () => {
      clearTimeout(slow);
      clearTimeout(stuck);
      setPhase("idle");
    };
  }, [pending]);

  const label = pending ? (phase === "idle" ? pendingText : "Still working…") : children;

  return (
    <>
      <button
        type="submit"
        formAction={formAction}
        disabled={pending || disabled}
        aria-busy={pending}
        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {label}
      </button>
      {pending && phase === "stuck" ? (
        <p className="mt-2 text-center text-xs text-brand-500" role="status">
          Taking longer than usual.{" "}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="font-semibold text-brand-900 underline underline-offset-2"
          >
            Reload the page
          </button>{" "}
          if nothing happens.
        </p>
      ) : null}
    </>
  );
}
