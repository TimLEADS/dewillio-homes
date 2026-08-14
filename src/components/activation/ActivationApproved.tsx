import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

/**
 * The welcome screen once an admin approves the activation. It stays put — no
 * auto-redirect — so the applicant reads it and moves on only when they choose.
 */
export function ActivationApproved({ name, reference }: { name: string; reference: string | null }) {
  return (
    <div>
      <div className="relative h-16 w-16">
        <span className="ping-dot absolute inset-0 rounded-full bg-emerald-400/20" />
        <span className="absolute inset-1 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
          <Check className="h-7 w-7" strokeWidth={2.5} />
        </span>
      </div>

      <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.24em] text-accent-600">
        Activation approved
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold text-brand-950">
        You&rsquo;re in{name ? `, ${name}` : ""}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-brand-600">
        Your account is activated and approved. Continue whenever you&rsquo;re ready to set up your
        market so we can start matching you with qualified opportunities.
      </p>

      {reference ? (
        <div className="mt-6 flex items-center justify-between rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm">
          <span className="text-brand-500">Reference</span>
          <span className="font-mono font-semibold text-brand-900">{reference}</span>
        </div>
      ) : null}

      <div className="mt-7 flex flex-col gap-2.5">
        <Link
          href="/onboarding"
          className="flex items-center justify-center gap-2 rounded-lg bg-brand-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
        >
          Continue to onboarding
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg px-4 py-3 text-center text-sm font-semibold text-brand-600 transition-colors hover:text-brand-950"
        >
          Go to dashboard instead
        </Link>
      </div>
    </div>
  );
}
