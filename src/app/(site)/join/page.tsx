import type { Metadata } from "next";
import { BadgeCheck, CalendarCheck, Wallet } from "lucide-react";
import { JoinWizard } from "@/components/checkout/JoinWizard";
import { Container } from "@/components/ui";
import { Reveal } from "@/components/motion";

// The brand comes from the root layout's title template, so it isn't repeated here.
export const metadata: Metadata = {
  title: "Activate for $1",
  description:
    "Activate your Dewilio Homes agent account for a one-time $1 fee. No monthly subscription — you pay a 20% referral fee only when a referred transaction closes.",
  alternates: { canonical: "/join" },
  openGraph: { url: "/join", title: "Activate for $1 — Dewilio Homes" },
};

const ASSURANCES = [
  { icon: Wallet, label: "One-time $1 charge" },
  { icon: CalendarCheck, label: "No monthly fee" },
  { icon: BadgeCheck, label: "20% only on closings" },
];

export default function JoinPage() {
  return (
    <section className="relative overflow-hidden bg-brand-50/50 py-16 sm:py-24">
      <div className="bg-grid-light absolute inset-0" />
      <div className="animate-drift pointer-events-none absolute -left-20 top-10 h-80 w-80 rounded-full bg-accent-300/25 blur-[110px]" />
      <div className="animate-drift-slow pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-brand-300/25 blur-[110px]" />

      <Container className="relative flex flex-col items-center">
        <Reveal>
          <div className="mb-10 max-w-xl text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-accent-600">
              <span className="ping-dot h-1.5 w-1.5 rounded-full bg-accent-500" />
              Activation
            </p>
            <h1 className="font-display text-4xl font-bold leading-tight text-brand-950 sm:text-5xl">
              Activate for $1
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-brand-600">
              One-time activation. <strong className="text-brand-900">$0/month.</strong> A 20%
              referral fee only when a referred transaction closes.
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-2.5">
              {ASSURANCES.map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-2 text-xs font-semibold text-brand-700"
                >
                  <item.icon size={14} className="text-accent-600" />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={140} y={34} className="w-full">
          <div className="flex justify-center">
            <JoinWizard />
          </div>
        </Reveal>

        <p className="mt-8 max-w-md text-center text-xs leading-relaxed text-brand-400">
          By activating you confirm you hold a valid real estate license. Referral fee terms are
          subject to the signed referral agreement, applicable state law, and your brokerage&apos;s
          policies.
        </p>
      </Container>
    </section>
  );
}
