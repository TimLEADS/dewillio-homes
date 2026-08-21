import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  DollarSign,
  Handshake,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Zap,
} from "lucide-react";
import { Container, SectionHeading } from "@/components/ui";
import { Reveal, SpotlightCard } from "@/components/motion";
import { PageHero } from "@/components/site/PageHero";
import { PHOTOS } from "@/lib/images";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "The four steps of the Dewilio Homes referral program: activate your agent account for $1, get matched with local buyer and seller leads, work the lead, and pay a 20% referral fee only when the transaction closes.",
  alternates: { canonical: "/how-it-works" },
  openGraph: { url: "/how-it-works", title: "How It Works — Dewilio Homes" },
};

const PHASES = [
  {
    num: "01",
    icon: DollarSign,
    title: "Activate",
    body: "Pay a one-time $1 activation fee to verify and open your Dewilio Homes account. That's it — no monthly subscription and no expensive upfront lead packages.",
    photo: PHOTOS.signing,
  },
  {
    num: "02",
    icon: MapPin,
    title: "Get matched",
    body: "Complete onboarding: your market, primary city, ZIP codes, service radius, buyer/seller preference, specialties, availability and contact preferences.",
    photo: PHOTOS.suburbanStreet,
  },
  {
    num: "03",
    icon: Zap,
    title: "Work the lead",
    body: "Once approved and verified, qualified opportunities are matched to you. Manage them through your dashboard — track status, appointments and follow-ups.",
    photo: PHOTOS.agentWorking,
  },
  {
    num: "04",
    icon: Handshake,
    title: "Close & pay",
    body: "When a referred transaction closes, Dewilio Homes receives the agreed 20% referral fee from the closing, according to the signed referral agreement.",
    photo: PHOTOS.handshakeKeys,
  },
];

const TIMELINE = [
  {
    icon: DollarSign,
    title: "Activate your account",
    body: "Submit your agent info, accept the referral agreement and pay the $1 activation fee.",
  },
  {
    icon: UserCheck,
    title: "Complete onboarding",
    body: "Tell us your market, ZIP codes, lead preferences and availability in the guided wizard.",
  },
  {
    icon: ShieldCheck,
    title: "Get reviewed & approved",
    body: "Our team verifies your license and approves your market. You're notified in-app and by email.",
  },
  {
    icon: Zap,
    title: "Receive matched leads",
    body: "Qualified opportunities are matched to your profile and assigned to your dashboard.",
  },
  {
    icon: Handshake,
    title: "Close and pay the referral fee",
    body: "The 20% referral fee applies only when a referred transaction closes.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="overflow-hidden">
      <PageHero
        photo={PHOTOS.luxuryExterior}
        eyebrow={
          <>
            <Sparkles size={13} /> The process
          </>
        }
        title="How It Works"
        subtitle="Four steps from a one-time $1 activation to closing a referred transaction."
      />

      {/* Alternating photo phases */}
      <section className="py-24 sm:py-28">
        <Container>
          <div className="space-y-20 sm:space-y-28">
            {PHASES.map((phase, i) => {
              const flipped = i % 2 === 1;
              return (
                <div
                  key={phase.num}
                  className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
                >
                  <Reveal
                    x={flipped ? 30 : -30}
                    y={20}
                    className={flipped ? "lg:order-2" : ""}
                  >
                    <div className="img-zoom-host relative overflow-hidden rounded-[2.5rem] shadow-[0_45px_100px_-55px_rgba(11,31,58,0.7)]">
                      <Image
                        src={phase.photo}
                        alt=""
                        placeholder="blur"
                        sizes="(min-width: 1024px) 50vw, 100vw"
                        className="img-zoom h-[24rem] w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-975/60 via-transparent to-transparent" />
                      <span className="absolute bottom-6 left-7 font-display text-7xl font-bold text-white/85">
                        {phase.num}
                      </span>
                    </div>
                  </Reveal>

                  <Reveal
                    delay={120}
                    x={flipped ? -30 : 30}
                    y={20}
                    className={flipped ? "lg:order-1" : ""}
                  >
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-950 text-accent-400 shadow-lg shadow-brand-950/15">
                      <phase.icon size={24} />
                    </span>
                    <h2 className="mt-6 font-display text-3xl font-bold text-brand-950 sm:text-4xl">
                      {phase.title}
                    </h2>
                    <p className="mt-4 max-w-lg text-lg leading-relaxed text-brand-600">
                      {phase.body}
                    </p>
                  </Reveal>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Timeline */}
      <section className="relative overflow-hidden bg-brand-975 py-24 text-white sm:py-28">
        <div className="bg-grid absolute inset-0" />
        <div className="animate-drift pointer-events-none absolute right-0 top-20 h-96 w-96 rounded-full bg-accent-500/12 blur-[120px]" />

        <Container className="relative">
          <Reveal>
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-accent-300">
                After you activate
              </p>
              <h2 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
                From $1 to your first opportunity
              </h2>
            </div>
          </Reveal>

          <ol className="mx-auto max-w-3xl">
            {TIMELINE.map((step, i) => (
              <Reveal key={step.title} delay={i * 110} y={26}>
                <li className="group flex gap-6">
                  <div className="flex flex-col items-center">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] text-accent-400 backdrop-blur-sm transition-all duration-500 group-hover:border-accent-400/50 group-hover:bg-accent-500 group-hover:text-brand-975">
                      <step.icon size={19} />
                    </span>
                    {i < TIMELINE.length - 1 ? (
                      <span className="my-1 w-px flex-1 bg-gradient-to-b from-white/25 to-white/5" />
                    ) : null}
                  </div>
                  <div className="pb-10">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-300">
                      Step {i + 1}
                    </p>
                    <h3 className="mt-2 font-display text-xl font-bold">{step.title}</h3>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-brand-300">
                      {step.body}
                    </p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-24 sm:py-28">
        <Container>
          <Reveal>
            <SpotlightCard
              className="card-lift overflow-hidden rounded-[2.5rem] border border-brand-100 bg-white p-10 text-center shadow-[0_40px_90px_-60px_rgba(11,31,58,0.7)] sm:p-16"
              spotlightColor="rgba(201,164,74,0.12)"
            >
              <SectionHeading
                eyebrow="Next step"
                title="Ready to start?"
                subtitle="Activate for $1 today and pay only when a referred transaction closes."
                center
              />
              <Link
                href="/join"
                className="btn-sheen group inline-flex items-center gap-2 rounded-full bg-brand-950 px-8 py-4 text-base font-bold text-white shadow-lg shadow-brand-950/20 transition-all duration-500 hover:shadow-xl"
              >
                Activate for $1
                <ArrowRight
                  size={18}
                  className="transition-transform duration-500 group-hover:translate-x-1.5"
                />
              </Link>
            </SpotlightCard>
          </Reveal>
        </Container>
      </section>
    </div>
  );
}
