import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

/**
 * The welcome screen once an admin approves the activation. It stays put — no
 * auto-redirect — so the applicant reads it and moves on only when they choose.
 */
export function ActivationApproved({ name, reference }: { name: string; reference: string | null }) {
  return (
    <div className="text-center">
      <div className="relative mx-auto h-24 w-24">
        <span className="ping-dot absolute inset-0 rounded-full bg-emerald-400/20" />
        <span className="absolute inset-2 flex items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/40">
          <Check className="h-10 w-10" strokeWidth={2.5} />
        </span>
      </div>

      <p className="mt-6 text-xs font-bold uppercase tracking-[0.24em] text-accent-400">Activation approved</p>
      <h1 className="mt-2 font-serif text-3xl font-bold text-white">You&rsquo;re in{name ? `, ${name}` : ""}</h1>
      <p className="mt-2 text-sm leading-relaxed text-white/60">
        Your account is activated and approved. Continue whenever you&rsquo;re ready to set up your market so we
        can start matching you with qualified opportunities.
      </p>

      {reference ? (
        <div className="mt-6 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
          <span className="text-white/50">Reference</span>
          <span className="font-mono font-semibold text-white/90">{reference}</span>
        </div>
      ) : null}

      <div className="mt-7 flex flex-col gap-2.5">
        <Link
          href="/onboarding"
          className="flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-3.5 text-sm font-bold text-brand-950 transition-colors hover:bg-accent-400"
        >
          Continue to onboarding
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/dashboard"
          className="rounded-xl px-4 py-3 text-sm font-semibold text-white/70 transition-colors hover:text-white"
        >
          Go to dashboard instead
        </Link>
      </div>
    </div>
  );
}
