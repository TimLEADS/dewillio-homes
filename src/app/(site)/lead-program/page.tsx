import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  Gauge,
  Home,
  MapPin,
  Scale,
  Sparkles,
  Timer,
  UserCheck,
} from "lucide-react";
import { Container, SectionHeading } from "@/components/ui";
import { Reveal, SpotlightCard } from "@/components/motion";
import { PageHero } from "@/components/site/PageHero";
import { PHOTOS } from "@/lib/images";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Lead Program",
  description:
    "How Dewilio Homes sources and matches buyer and seller opportunities to licensed agents by market, specialty and capacity — and what the 20% closed-transaction referral fee covers.",
  alternates: { canonical: "/lead-program" },
  openGraph: { url: "/lead-program", title: "The Lead Program — Dewilio Homes" },
};

const MATCH_FACTORS = [
  { n: "01", icon: MapPin, factor: "ZIP code", body: "The lead's ZIP is matched against the ZIP codes you serve." },
  { n: "02", icon: Home, factor: "Lead type", body: "Buyer or seller preference is honored before assignment." },
  { n: "03", icon: Building2, factor: "Specialty", body: "First-time buyers, luxury, investors, relocation, commercial, general." },
  { n: "04", icon: CalendarClock, factor: "Availability", body: "Working hours, phone availability and weekend availability count." },
  { n: "05", icon: UserCheck, factor: "Agent status", body: "Only active + approved + verified agents are eligible." },
  { n: "06", icon: Gauge, factor: "Capacity", body: "Agents above their active-lead capacity are skipped." },
  { n: "07", icon: Timer, factor: "Response performance", body: "Faster responders rank higher in future matches." },
];

const FEE_STAGES = [
  "Pending",
  "Under Contract",
  "Closed — Fee Due",
  "Paid",
];

const TRACKED = [
  "Lead date and source",
  "Assigned agent and client",
  "Property and estimated transaction value",
  "Under Contract and closing dates",
  "Gross commission and 20% referral fee",
  "Fee status at every stage",
];

export default function LeadProgramPage() {
  return (
    <div className="overflow-hidden">
      <PageHero
        photo={PHOTOS.neighborhood}
        eyebrow={
          <>
            <Sparkles size={13} /> Lead program
          </>
        }
        title={
          <>
            Free leads. $1 activation.{" "}
            <span className="text-shimmer">20% when you close.</span>
          </>
        }
        subtitle="A referral program, not a lead-selling service. We make money only when you do."
      />

      {/* Matching engine */}
      <section className="py-24 sm:py-28">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Lead matching system"
              title="Seven signals decide who gets the assignment."
              subtitle="Assignments use a scoring engine that weighs location, preference, specialty, availability, status, capacity and performance."
              center
            />
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {MATCH_FACTORS.map((factor, i) => (
              <Reveal key={factor.factor} delay={i * 80} y={30}>
                <SpotlightCard
                  className="card-lift group relative h-full overflow-hidden rounded-[1.75rem] border border-brand-100 bg-white p-7 hover:border-accent-300"
                  spotlightColor="rgba(201,164,74,0.1)"
                >
                  <span className="absolute right-5 top-4 font-display text-5xl font-bold text-brand-50 transition-colors duration-500 group-hover:text-accent-100">
                    {factor.n}
                  </span>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-950 text-accent-400 transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110">
                    <factor.icon size={19} />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-bold text-brand-950">
                    {factor.factor}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-brand-600">{factor.body}</p>
                </SpotlightCard>
              </Reveal>
            ))}

            <Reveal delay={560} y={30}>
              <div className="flex h-full flex-col justify-center rounded-[1.75rem] border border-accent-200 bg-gradient-to-br from-accent-50 to-white p-7">
                <p className="text-sm font-semibold leading-relaxed text-brand-900">
                  Assignment eligibility
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["Active", "Approved", "Verified"].map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-accent-700 ring-1 ring-accent-200"
                    >
                      <BadgeCheck size={13} />
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-relaxed text-brand-500">
                  All three are required before any lead is assigned to an account.
                </p>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* Fee tracking */}
      <section className="relative overflow-hidden bg-brand-975 py-24 text-white sm:py-28">
        <div className="bg-grid absolute inset-0" />
        <div className="animate-drift-slow pointer-events-none absolute left-10 top-10 h-96 w-96 rounded-full bg-brand-500/12 blur-[120px]" />

        <Container className="relative">
          <div className="grid gap-14 lg:grid-cols-2">
            <Reveal>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-accent-300">
                Fee tracking
              </p>
              <h2 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
                Every referred transaction, tracked end to end.
              </h2>

              {/* Stage rail */}
              <div className="mt-10 space-y-0">
                {FEE_STAGES.map((stage, i) => (
                  <Reveal key={stage} delay={120 + i * 110} y={18} blur={3}>
                    <div className="group flex items-center gap-4">
                      <div className="flex flex-col items-center">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all duration-500 ${
                            i === FEE_STAGES.length - 1
                              ? "bg-emerald-500 text-white"
                              : "border border-accent-400/50 bg-accent-400/15 text-accent-300"
                          }`}
                        >
                          {i + 1}
                        </span>
                        {i < FEE_STAGES.length - 1 ? (
                          <span className="my-1 h-8 w-px bg-gradient-to-b from-accent-400/45 to-white/8" />
                        ) : null}
                      </div>
                      <span className="pb-8 text-base font-semibold text-brand-100 transition-colors duration-500 group-hover:text-white">
                        {stage}
                      </span>
                    </div>
                  </Reveal>
                ))}
              </div>
            </Reveal>

            <Reveal delay={140} y={34}>
              <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10">
                <Image
                  src={PHOTOS.kitchen}
                  alt=""
                  placeholder="blur"
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="h-64 w-full object-cover opacity-70"
                />
                <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-transparent to-brand-975" />
                <div className="relative -mt-16 px-8 pb-9">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-300">
                    What we record
                  </p>
                  <ul className="mt-5 space-y-3.5">
                    {TRACKED.map((item, i) => (
                      <Reveal key={item} delay={220 + i * 70} y={12} blur={2}>
                        <li className="flex items-start gap-3 text-sm text-brand-200">
                          <BadgeCheck size={17} className="mt-0.5 shrink-0 text-accent-400" />
                          {item}
                        </li>
                      </Reveal>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* Referral agreement */}
      <section id="referral-agreement" className="scroll-mt-28 bg-brand-50/70 py-24 sm:py-28">
        <Container>
          <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal>
              <SectionHeading
                eyebrow="Referral agreement"
                title="Clear terms before you pay a cent."
              />
              <div className="img-zoom-host overflow-hidden rounded-[2rem] shadow-[0_40px_90px_-60px_rgba(11,31,58,0.7)]">
                <Image
                  src={PHOTOS.signing}
                  alt=""
                  placeholder="blur"
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="img-zoom h-64 w-full object-cover"
                />
              </div>
            </Reveal>

            <Reveal delay={140}>
              <div className="space-y-5 rounded-[2rem] border border-brand-100 bg-white p-9 shadow-[0_30px_80px_-60px_rgba(11,31,58,0.6)]">
                {[
                  {
                    lead: "$1 activation fee",
                    body: "A one-time charge to verify and activate your account. It is not a subscription and it is not a payment for leads.",
                  },
                  {
                    lead: "20% referral fee",
                    body: "Applies only to referred transactions that successfully close, according to the signed referral agreement. Never charged as a monthly or recurring fee.",
                  },
                  {
                    lead: "No guarantees",
                    body: "Leads are not guaranteed. Referral fee terms must comply with applicable state laws and your brokerage's policies. You review and accept the agreement before activation.",
                  },
                ].map((clause, i) => (
                  <Reveal key={clause.lead} delay={200 + i * 100} y={16} blur={3}>
                    <div className="border-l-2 border-accent-400 pl-5">
                      <p className="font-display text-lg font-bold text-brand-950">{clause.lead}</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-brand-600">{clause.body}</p>
                    </div>
                  </Reveal>
                ))}

                <Link
                  href="/join"
                  className="btn-sheen group inline-flex items-center gap-2 rounded-full bg-brand-950 px-6 py-3.5 text-sm font-bold text-white transition-all duration-500 hover:shadow-lg"
                >
                  Activate for $1
                  <ArrowRight
                    size={16}
                    className="transition-transform duration-500 group-hover:translate-x-1.5"
                  />
                </Link>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* Compliance note */}
      <section className="py-24 sm:py-28">
        <Container>
          <Reveal>
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-50 text-accent-600">
                <Scale size={30} />
              </span>
              <h2 className="font-display text-3xl font-bold leading-tight text-brand-950 sm:text-4xl">
                Referral rules vary by state and brokerage — review the 20% structure before launch.
              </h2>
              <p className="max-w-xl text-lg leading-relaxed text-brand-600">
                This platform is built to track referrals transparently and to make the distinction
                between the $1 activation fee and the 20% referral fee unmistakably clear.
              </p>
            </div>
          </Reveal>
        </Container>
      </section>
    </div>
  );
}
