"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2, Lock, ShieldAlert, ShieldCheck } from "lucide-react";

const STEPS = [
  { key: "paid", label: "Payment confirmed" },
  { key: "review", label: "Application under review" },
  { key: "identity", label: "Identity verification" },
  { key: "approval", label: "Final approval" },
] as const;

/** Which step is spinning for a given stage; earlier steps render as done. */
function activeStep(stage: string): number {
  if (stage === "otp_verified") return 3;
  return 1; // waiting
}

function elapsedLabel(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * The live loading screen an applicant holds on after paying. It polls the
 * activation status and, the moment an admin routes them, follows to the OTP or
 * approval screen. Until then it shows an honest, moving picture of the review.
 */
export function ActivationPending({ initialStage }: { initialStage: string }) {
  const router = useRouter();
  const [stage, setStage] = useState(initialStage);
  const [seconds, setSeconds] = useState(0);
  const navigated = useRef(false);

  useEffect(() => {
    const started = Date.now();
    const tick = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    let stopped = false;

    const check = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await fetch("/api/activation/status", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { stage: string; destination: string };
        if (stopped || navigated.current) return;

        if (data.stage === "otp" || data.stage === "approved") {
          navigated.current = true;
          router.replace(data.destination);
          return;
        }
        setStage(data.stage);
      } catch {
        // Offline for a beat — the next tick retries.
      }
    };

    const poll = setInterval(check, 2500);
    void check();
    return () => {
      stopped = true;
      clearInterval(poll);
    };
  }, [router]);

  if (stage === "rejected") {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30">
          <ShieldAlert size={30} />
        </div>
        <h1 className="mt-6 font-serif text-2xl font-bold text-white">Activation declined</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          We weren&rsquo;t able to approve this activation. If you believe this is a mistake, our team
          can take another look.
        </p>
        <div className="mt-7 flex flex-col gap-2.5">
          <a
            href="mailto:support@dewillio.com"
            className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-brand-950 transition-colors hover:bg-white/90"
          >
            Contact support
          </a>
          <Link href="/" className="rounded-xl px-4 py-3 text-sm font-semibold text-white/70 hover:text-white">
            Back to homepage
          </Link>
        </div>
      </div>
    );
  }

  const active = activeStep(stage);
  const verified = stage === "otp_verified";

  return (
    <div className="text-center">
      {/* Emblem: soft ping ring, a slow dashed orbit, and the shield at rest */}
      <div className="relative mx-auto h-24 w-24">
        <span className="ping-dot absolute inset-0 rounded-full bg-accent-500/15" />
        <span className="animate-spin-slow absolute inset-1 rounded-full border border-dashed border-white/20" />
        <span className="absolute inset-0 flex items-center justify-center">
          {verified ? (
            <ShieldCheck className="h-9 w-9 text-accent-400" strokeWidth={2} />
          ) : (
            <Loader2 className="h-9 w-9 animate-spin text-accent-400" strokeWidth={2.2} />
          )}
        </span>
      </div>

      <p className="mt-6 font-serif text-3xl font-bold text-white">$1.00</p>
      <p className="mt-1 text-sm text-white/55">Account activation</p>

      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/80">
        <span className="ping-dot h-1.5 w-1.5 rounded-full bg-accent-400" />
        {verified ? "Identity verified — final approval in progress" : "A reviewer is checking your application"}
      </div>

      {/* Indeterminate shimmer — the wait is genuinely open-ended */}
      <div className="relative mt-7 h-1 w-full overflow-hidden rounded-full bg-white/10">
        <span className="animate-shimmer absolute inset-y-0 left-0 w-1/2 rounded-full" />
      </div>

      <ul className="mt-7 space-y-3 text-left">
        {STEPS.map((step, i) => (
          <li key={step.key} className="flex items-center gap-3 text-sm">
            {i < active ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
            ) : i === active ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-accent-400" />
              </span>
            ) : (
              <span className="h-5 w-5 shrink-0 rounded-full border border-white/20" />
            )}
            <span className={i <= active ? "text-white/90" : "text-white/40"}>{step.label}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-white/45">
        <span className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5" />
          Keep this window open
        </span>
        <span className="tabular-nums">{elapsedLabel(seconds)}</span>
      </div>
    </div>
  );
}
