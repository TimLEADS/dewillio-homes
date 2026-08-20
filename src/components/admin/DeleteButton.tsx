"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

export type DeleteAction = (formData: FormData) => Promise<{ ok?: boolean; error?: string } | void>;

/** How long an armed button waits for the confirming click before standing down. */
const ARMED_MS = 5000;

/**
 * Two-click delete for admin rows. The first click arms the button and it
 * relabels itself; the second one actually deletes. Nothing is removed on a
 * single stray click, and it avoids a native `confirm()` dialog, which blocks
 * the whole tab. An armed button disarms itself after a few seconds so a
 * forgotten one can't be triggered later by accident.
 */
export function DeleteButton({
  id,
  action,
  label = "Delete",
  confirmLabel = "Delete?",
  className = "",
  onDeleted,
}: {
  id: number;
  action: DeleteAction;
  label?: string;
  confirmLabel?: string;
  className?: string;
  onDeleted?: () => void;
}) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), ARMED_MS);
    return () => clearTimeout(id);
  }, [armed]);

  const run = () => {
    if (!armed) {
      setError(undefined);
      setArmed(true);
      return;
    }
    setArmed(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", String(id));
      const res = await action(fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      onDeleted?.();
    });
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={run}
        disabled={pending}
        aria-label={armed ? `${confirmLabel} — click again to confirm` : label}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          armed
            ? "bg-rose-600 text-white hover:bg-rose-700"
            : "border border-rose-200 text-rose-700 hover:bg-rose-50"
        }`}
      >
        {pending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        {armed ? confirmLabel : label}
      </button>
      {error ? <p className="mt-1 text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}
