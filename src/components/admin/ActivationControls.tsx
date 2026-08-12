"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Ban, KeyRound, Loader2, RotateCcw } from "lucide-react";
import { setActivationStageAction } from "@/lib/actions/activation";

type Target = "otp" | "approved" | "rejected" | "waiting";

const ACTIONS: Array<{
  target: Target;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  className: string;
}> = [
  { target: "otp", label: "Send code", icon: KeyRound, className: "bg-brand-950 text-white hover:bg-brand-800" },
  { target: "approved", label: "Approve", icon: BadgeCheck, className: "bg-emerald-600 text-white hover:bg-emerald-700" },
  { target: "rejected", label: "Decline", icon: Ban, className: "border border-rose-200 text-rose-700 hover:bg-rose-50" },
  { target: "waiting", label: "Reset", icon: RotateCcw, className: "border border-brand-200 text-brand-700 hover:bg-brand-50" },
];

/**
 * Per-applicant routing buttons in the activation queue. Each fires the server
 * action, then refreshes so the new stage (and any freshly minted code) shows.
 */
export function ActivationControls({ userId, stage }: { userId: number; stage: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<Target | null>(null);
  const [error, setError] = useState<string>();

  const run = (target: Target) => {
    setError(undefined);
    setBusy(target);
    const fd = new FormData();
    fd.set("userId", String(userId));
    fd.set("stage", target);
    startTransition(async () => {
      const res = await setActivationStageAction(fd);
      if (res?.error) setError(res.error);
      else router.refresh();
      setBusy(null);
    });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((a) => {
          // Sending a code is always allowed (a re-click reissues it); the other
          // targets are disabled when they'd just re-set the current stage.
          const isCurrent =
            (a.target === "approved" && stage === "approved") ||
            (a.target === "rejected" && stage === "rejected") ||
            (a.target === "waiting" && (stage === "waiting" || stage === "otp_verified"));
          return (
            <button
              key={a.target}
              type="button"
              onClick={() => run(a.target)}
              disabled={pending || isCurrent}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${a.className}`}
            >
              {busy === a.target ? <Loader2 size={14} className="animate-spin" /> : <a.icon size={14} />}
              {a.target === "otp" && stage === "otp" ? "Resend code" : a.label}
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-2 text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}
