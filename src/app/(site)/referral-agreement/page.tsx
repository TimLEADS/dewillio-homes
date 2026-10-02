import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  FileText,
  Lock,
  Scale,
  ShieldCheck,
} from "lucide-react";
import {
  AGREEMENT_VERSION,
  ACTIVATION_FEE,
  REFERRAL_AGREEMENT_BODY,
  REFERRAL_FEE_RATE,
} from "@/lib/db";
import { parseAgreement } from "@/lib/agreement";
import { Container } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { AgreementNav } from "@/components/site/AgreementNav";
import { AgreementTools } from "@/components/site/AgreementTools";

export const dynamic = "force-static";

const PAGE_TITLE = "Referral Agreement";
const PAGE_DESCRIPTION =
  "The full Dewilio Homes agent referral agreement, in plain English. Covers the one-time activation fee, the 20% referral fee on closed transactions, brokerage compliance and termination. Read it online, save it as a PDF, or share it with your broker for approval.";

export const metadata: Metadata = {
  title: `${PAGE_TITLE} — Dewilio Homes`,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/referral-agreement" },
  openGraph: {
    url: "/referral-agreement",
    title: `${PAGE_TITLE} — Dewilio Homes`,
    description: PAGE_DESCRIPTION,
    type: "article",
  },
};

/** "twenty percent (20%)" is spelled out in the clause text; this is the numeric twin. */
const REFERRAL_PERCENT = Math.round(REFERRAL_FEE_RATE * 100);
const FEE_DISPLAY = `$${ACTIVATION_FEE.toFixed(2)}`;

const KEY_TERMS = [
  {
    icon: BadgeCheck,
    label: "One-time activation",
    value: FEE_DISPLAY,
    note: "Charged once to verify your account. Never a subscription, never a lead package.",
  },
  {
    icon: Scale,
    label: "Referral fee",
    value: `${REFERRAL_PERCENT}%`,
    note: `Earned only when a referred transaction closes — ${REFERRAL_PERCENT}% of the gross commission your brokerage actually receives.`,
  },
  {
    icon: ShieldCheck,
    label: "No lead guarantee",
    value: "None",
    note: "Matching depends on market coverage, your capacity and licensing status. No minimum volume is promised.",
  },
  {
    icon: CalendarDays,
    label: "Either side can exit",
    value: "Any time",
    note: "Terminate on written notice. Referrals closing within 180 days still owe the fee.",
  },
];

export default function ReferralAgreementPage() {
  const clauses = parseAgreement(REFERRAL_AGREEMENT_BODY);
  if (clauses.length === 0) notFound();

  // Flat text for the copy button and for search engines that read the raw text.
  const plainText = [
    "DEWILIO HOMES — AGENT REFERRAL AGREEMENT",
    `Version ${AGREEMENT_VERSION}`,
    "",
    ...clauses.map((c) => `${c.number}. ${c.title}\n${c.body}`),
  ].join("\n\n");

  return (
    <div className="bg-white">
      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="print:hidden relative overflow-hidden bg-brand-975 py-20 text-white sm:py-24">
        <div className="bg-grid absolute inset-0" />
        <div className="animate-drift pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-accent-500/16 blur-[110px]" />
        <div className="animate-drift-slow pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-brand-400/18 blur-[120px]" />

        <Container className="relative">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-300 backdrop-blur-md">
              <FileText size={13} />
              Legal · Plain English
            </div>

            <h1 className="font-display text-4xl font-bold leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl">
              Agent Referral{" "}
              <span className="text-shimmer">Agreement</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-brand-200">
              The complete agreement you accept when you activate — every clause, in full, with
              nothing abbreviated. Read it here, save a copy for your files, or send it to your
              broker, because most states require the referral fee to be approved and paid
              broker-to-broker.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-brand-100 backdrop-blur-md">
                <FileText size={13} className="text-accent-400" />
                Version {AGREEMENT_VERSION}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-brand-100 backdrop-blur-md">
                <Lock size={13} className="text-accent-400" />
                {clauses.length} clauses
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-brand-100 backdrop-blur-md">
                <BadgeCheck size={13} className="text-accent-400" />
                {FEE_DISPLAY} activation · {REFERRAL_PERCENT}% on closing
              </span>
            </div>

            <div className="mt-9">
              <AgreementTools plainText={plainText} />
            </div>
          </div>
        </Container>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Key terms                                                        */}
      {/* ---------------------------------------------------------------- */}
      <section className="print:hidden border-b border-brand-100 bg-brand-50/60 py-16">
        <Container>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {KEY_TERMS.map((term, i) => (
              <Reveal key={term.label} delay={i * 90} y={26}>
                <div className="flex h-full flex-col rounded-2xl border border-brand-100 bg-white p-6 shadow-[0_18px_44px_-34px_rgba(11,31,58,0.6)]">
                  <term.icon size={20} className="text-accent-500" />
                  <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-500">
                    {term.label}
                  </p>
                  <p className="mt-1.5 font-display text-2xl font-bold text-brand-950">
                    {term.value}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-brand-600">{term.note}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* The agreement itself                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[16rem_minmax(0,1fr)]">
            {/* Clause navigator */}
            <aside className="lg:sticky lg:top-40 lg:self-start">
              <AgreementNav
                clauses={clauses.map((c) => ({
                  number: c.number,
                  title: c.title,
                  slug: c.slug,
                }))}
              />
            </aside>

            {/* Document */}
            <article className="min-w-0">
              <div className="rounded-[2rem] border border-brand-100 bg-white p-7 shadow-[0_28px_70px_-58px_rgba(11,31,58,0.7)] sm:p-12">
                <header className="border-b border-brand-100 pb-7">
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-brand-500">
                    Dewilio Homes · Agent Referral Agreement
                  </p>
                  <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-brand-950">
                    Referral Agreement
                  </h2>
                  <p className="mt-2 text-sm text-brand-500">
                    Version {AGREEMENT_VERSION} · This is the full text, unabridged.
                  </p>
                </header>

                <div className="mt-9 space-y-9">
                  {clauses.map((clause) => (
                    <section
                      key={clause.slug}
                      id={clause.slug}
                      className="scroll-mt-40 break-inside-avoid"
                    >
                      <h3 className="flex items-baseline gap-3 font-display text-lg font-bold text-brand-950">
                        <span className="font-mono text-sm tabular-nums text-accent-600">
                          {String(clause.number).padStart(2, "0")}
                        </span>
                        <span className="tracking-wide">{clause.title}</span>
                      </h3>
                      <p className="mt-3 text-[15px] leading-[1.75] text-brand-700">
                        {clause.body}
                      </p>
                    </section>
                  ))}
                </div>

                {/* Acceptance */}
                <section className="mt-12 border-t border-brand-100 pt-9 break-inside-avoid">
                  <h3 className="font-display text-lg font-bold text-brand-950">
                    How acceptance is recorded
                  </h3>
                  <p className="mt-3 text-[15px] leading-[1.75] text-brand-700">
                    There is nothing to sign by hand. When you activate your account you tick a
                    box confirming you have reviewed and accept these terms, and Dewilio stores
                    that acceptance against your account with the version number above, the
                    timestamp, your brokerage and the payment reference for the {FEE_DISPLAY}{" "}
                    activation fee. The agreement is then bound to every account you activate, so
                    you always have the exact version you agreed to.
                  </p>
                  <p className="mt-4 text-[15px] leading-[1.75] text-brand-700">
                    Because referral fees are usually paid broker-to-broker, most agents send this
                    page to their broker for written approval before working any referred lead.
                  </p>
                </section>

                <footer className="mt-10 rounded-2xl border border-brand-100 bg-brand-50/70 p-6">
                  <p className="flex items-start gap-3 text-sm leading-relaxed text-brand-600">
                    <Scale size={16} className="mt-0.5 shrink-0 text-accent-600" />
                    <span>
                      This Agreement is a program document and does not constitute legal or
                      regulatory advice. Referral fee arrangements are subject to state law,
                      brokerage policy and regulatory review. Confirm the arrangement with your
                      broker and counsel before participating.
                    </span>
                  </p>
                </footer>
              </div>
            </article>
          </div>
        </Container>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* CTA                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="print:hidden border-t border-brand-100 bg-brand-50/60 py-16">
        <Container>
          <Reveal>
            <div className="flex flex-col items-center gap-6 text-center">
              <h2 className="max-w-2xl font-display text-3xl font-bold leading-tight text-brand-950 sm:text-4xl">
                Read the terms. Then decide.
              </h2>
              <p className="max-w-xl text-lg leading-relaxed text-brand-600">
                No obligation until you activate. When you&apos;re comfortable,{" "}
                {FEE_DISPLAY} opens your account and you can start receiving matches.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/join"
                  className="btn-sheen inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-400 via-accent-500 to-accent-600 px-7 py-3.5 text-base font-bold text-brand-975 shadow-[0_18px_44px_-16px_rgba(201,164,74,0.85)] transition-all duration-500"
                >
                  Activate for {FEE_DISPLAY}
                  <ArrowRight
                    size={17}
                    className="transition-transform duration-500 group-hover:translate-x-1"
                  />
                </Link>
                <Link
                  href="/faq"
                  className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-7 py-3.5 text-base font-semibold text-brand-900 transition-colors hover:border-brand-400 hover:bg-brand-50"
                >
                  Read the FAQ
                </Link>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </div>
  );
}