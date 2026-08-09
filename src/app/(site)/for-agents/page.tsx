import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  ClipboardCheck,
  DollarSign,
  MapPin,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
} from "lucide-react";
import { Container, SectionHeading } from "@/components/ui";
import { CountUp, Reveal, SpotlightCard } from "@/components/motion";
import { PageHero } from "@/components/site/PageHero";
import { AGENT_PORTRAITS, PHOTOS } from "@/lib/images";

const BENEFITS = [
  {
    icon: DollarSign,
    title: "One-time $1 activation",
    body: "A single dollar verifies your account. There is no monthly software fee and no minimum lead spend.",
  },
  {
    icon: BadgeCheck,
    title: "20% only on closed referrals",
    body: "We earn only when a referred transaction closes, per the signed referral agreement. We're aligned with your success.",
  },
  {
    icon: CalendarCheck,
    title: "A dashboard that runs your pipeline",
    body: "New leads, appointments, transactions and referral fees in one clean view — with follow-up support.",
  },
  {
    icon: MapPin,
    title: "Local matching",
    body: "ZIP codes, service area, lead type, specialty and availability drive who gets matched to what.",
  },
  {
    icon: UserCheck,
    title: "Approved & verified",
    body: "Only active, approved and license-verified agents receive assignments.",
  },
  {
    icon: SlidersHorizontal,
    title: "You control your profile",
    body: "Set service area, buyer/seller preferences, specialties, capacity and working hours.",
  },
];

const REQUIREMENTS = [
  {
    icon: ClipboardCheck,
    title: "Active real estate license",
    body: "You must hold a valid license in the state(s) where you want to receive leads.",
  },
  {
    icon: ShieldCheck,
    title: "Approved brokerage",
    body: "You'll share your brokerage details. Referral fees are handled per your brokerage's rules.",
  },
  {
    icon: MapPin,
    title: "Defined market",
    body: "Primary city, ZIP codes and service radius so matches stay local and relevant.",
  },
  {
    icon: UserCheck,
    title: "Review & approval",
    body: "Our team verifies your license and approves your market before you receive assignments.",
  },
];

export default function ForAgentsPage() {
  return (
    <div className="overflow-hidden">
      <PageHero
        photo={PHOTOS.agentWorking}
        eyebrow="For agents"
        title="Built for agents who would rather pay on results."
        subtitle="A free-to-start way to access qualified buyer and seller opportunities — with clear terms and no upfront lead packages."
      >
        <div className="flex flex-col items-center gap-5">
          <div className="flex -space-x-3">
            {AGENT_PORTRAITS.map((portrait, i) => (
              <Image
                key={i}
                src={portrait}
                alt=""
                placeholder="blur"
                className="h-11 w-11 rounded-full border-2 border-brand-975 object-cover transition-transform duration-500 hover:z-10 hover:-translate-y-1.5 hover:scale-110"
              />
            ))}
          </div>
          <p className="text-sm text-brand-300">
            Licensed agents, verified before a single lead is assigned.
          </p>
        </div>
      </PageHero>

      {/* The pitch */}
      <section className="py-24 sm:py-28">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="The pitch"
              title="Why pay $500–$2,000 for leads when you can activate for $1?"
              subtitle="Lead packages charge you whether or not the phone ever rings. A referral fee only lands when a transaction does."
            />
          </Reveal>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((benefit, i) => (
              <Reveal key={benefit.title} delay={i * 90} y={32}>
                <SpotlightCard
                  className="card-lift group h-full rounded-[1.75rem] border border-brand-100 bg-white p-7 shadow-[0_24px_60px_-48px_rgba(11,31,58,0.6)] hover:border-accent-300"
                  spotlightColor="rgba(201,164,74,0.1)"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-100 text-accent-700 transition-transform duration-500 group-hover:scale-110">
                    <benefit.icon size={21} />
                  </span>
                  <h3 className="mt-5 font-display text-xl font-bold text-brand-950">
                    {benefit.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-brand-600">{benefit.body}</p>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* Cost comparison */}
      <section className="relative overflow-hidden bg-brand-975 py-24 text-white sm:py-28">
        <Image
          src={PHOTOS.livingRoom}
          alt=""
          fill
          placeholder="blur"
          sizes="100vw"
          className="object-cover opacity-15"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-975 via-brand-975/92 to-brand-975" />
        <div className="bg-grid absolute inset-0" />

        <Container className="relative">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <Reveal>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-accent-300">
                The math
              </p>
              <h2 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
                Your risk before the first closing:{" "}
                <span className="text-shimmer">one dollar.</span>
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-brand-300">
                Everything else is contingent on a referred transaction actually closing. That is
                the whole model.
              </p>
            </Reveal>

            <Reveal delay={140} y={36}>
              <div className="space-y-4">
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-400">
                    Typical lead package
                  </p>
                  <p className="mt-3 font-display text-4xl font-bold text-brand-300 line-through decoration-rose-400/70 decoration-2">
                    $<CountUp to={2000} duration={2000} />
                  </p>
                  <p className="mt-2 text-sm text-brand-400">
                    Paid upfront. Owed whether or not anything closes.
                  </p>
                </div>

                <div className="relative overflow-hidden rounded-3xl border border-accent-400/35 bg-accent-500/10 p-7 backdrop-blur-sm">
                  <div className="animate-drift pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-accent-400/25 blur-3xl" />
                  <p className="relative text-[11px] font-bold uppercase tracking-[0.22em] text-accent-300">
                    Dewilio Homes
                  </p>
                  <p className="relative mt-3 font-display text-5xl font-bold text-white">
                    $<CountUp to={1} duration={1200} />
                  </p>
                  <p className="relative mt-2 text-sm text-brand-200">
                    One-time activation. Then 20% only on a closed referral.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* Requirements */}
      <section className="bg-brand-50/70 py-24 sm:py-28">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Requirements"
              title="What you need to join"
              subtitle="Keeping the bar high is what keeps the matches worth having."
              center
            />
          </Reveal>

          <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-2">
            {REQUIREMENTS.map((req, i) => (
              <Reveal key={req.title} delay={i * 100} y={28}>
                <SpotlightCard
                  className="card-lift flex h-full gap-4 rounded-[1.75rem] border border-brand-100 bg-white p-7 hover:border-accent-300"
                  spotlightColor="rgba(201,164,74,0.1)"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-950 text-accent-400">
                    <req.icon size={20} />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-brand-950">{req.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-brand-600">{req.body}</p>
                  </div>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>

          <Reveal delay={200}>
            <div className="mt-16 text-center">
              <h2 className="font-display text-3xl font-bold text-brand-950 sm:text-4xl">
                Activate your account today
              </h2>
              <p className="mx-auto mt-4 max-w-md text-lg text-brand-600">
                Free to start. Pay only when a referred transaction closes.
              </p>
              <Link
                href="/join"
                className="btn-sheen group mt-8 inline-flex items-center gap-2 rounded-full bg-brand-950 px-8 py-4 text-base font-bold text-white shadow-lg shadow-brand-950/20 transition-all duration-500 hover:shadow-xl"
              >
                Activate for $1
                <ArrowRight
                  size={18}
                  className="transition-transform duration-500 group-hover:translate-x-1.5"
                />
              </Link>
            </div>
          </Reveal>
        </Container>
      </section>
    </div>
  );
}
