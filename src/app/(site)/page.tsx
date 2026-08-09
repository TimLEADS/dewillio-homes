import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  DollarSign,
  Handshake,
  Landmark,
  MapPin,
  PlayCircle,
  Quote,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { Container, SectionHeading } from "@/components/ui";
import { Carousel, CountUp, Marquee, Parallax, Reveal, SpotlightCard } from "@/components/motion";
import { AGENT_PORTRAITS, PHOTOS } from "@/lib/images";

const TRUST_POINTS = [
  { icon: Wallet, label: "No monthly fee" },
  { icon: Landmark, label: "No lead packages" },
  { icon: BadgeCheck, label: "Qualified opportunities" },
  { icon: Handshake, label: "Pay when you close" },
];

const HEADLINE = ["A", "modern", "referral", "engine", "for", "agents", "who", "close."];

const STATS = [
  { value: 1, prefix: "$", suffix: "", label: "One-time activation", detail: "Not a subscription." },
  { value: 0, prefix: "$", suffix: "/mo", label: "Monthly software fee", detail: "Nothing recurring, ever." },
  { value: 20, prefix: "", suffix: "%", label: "Referral fee", detail: "Only on closed transactions." },
  { value: 7, prefix: "", suffix: "", label: "Matching signals", detail: "ZIP, type, specialty & more." },
];

const MARQUEE_TAGS = [
  "First-time buyers",
  "Luxury",
  "Investors",
  "Relocation",
  "Commercial",
  "Buyer leads",
  "Seller leads",
  "ZIP-code matching",
  "Appointment tracking",
  "Referral tracking",
];

const STEPS = [
  {
    num: "01",
    icon: DollarSign,
    title: "Activate",
    body: "Pay $1 to activate your Dewilio Homes account. No subscriptions. No lead packages.",
    photo: PHOTOS.signing,
  },
  {
    num: "02",
    icon: MapPin,
    title: "Get matched",
    body: "Tell us your market, ZIP codes, specialties and availability so we can match you well.",
    photo: PHOTOS.neighborhood,
  },
  {
    num: "03",
    icon: Zap,
    title: "Work the lead",
    body: "Receive qualified opportunities and manage them through your central dashboard.",
    photo: PHOTOS.agentWorking,
  },
  {
    num: "04",
    icon: Handshake,
    title: "Close & get paid",
    body: "When a referred transaction closes, Dewilio Homes receives the agreed 20% referral fee.",
    photo: PHOTOS.handshakeKeys,
  },
];

const PROMISES = [
  {
    quote:
      "We do not sell leads. We take a referral fee when a transaction closes — so a lead that goes nowhere costs us, not you.",
    label: "The model",
    photo: PHOTOS.livingRoom,
  },
  {
    quote:
      "Matching weighs ZIP code, lead type, specialty, availability, status, capacity and response time. Closest fit wins the assignment.",
    label: "The matching",
    photo: PHOTOS.suburbanStreet,
  },
  {
    quote:
      "Every referred transaction is tracked from under contract to closing to fee paid — visible in your dashboard at each step.",
    label: "The tracking",
    photo: PHOTOS.kitchen,
  },
];

const FAQ_PREVIEW = [
  {
    q: "What exactly does the $1 pay for?",
    a: "It is a one-time charge that verifies and activates your account. It is not a subscription and it is not a payment for leads.",
  },
  {
    q: "Are leads guaranteed?",
    a: "No. We match qualified opportunities to your market and profile when they are available. Only active, approved and verified agents receive assignments.",
  },
  {
    q: "When is the 20% referral fee due?",
    a: "Only when a referred transaction closes, according to the signed referral agreement and your brokerage's rules.",
  },
];

export default function HomePage() {
  return (
    <div className="overflow-hidden">
      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden bg-brand-975 text-white">
        <Image
          src={PHOTOS.heroHome}
          alt=""
          fill
          priority
          placeholder="blur"
          sizes="100vw"
          className="animate-kenburns object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-975 via-brand-975/90 to-brand-950/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-975 via-transparent to-brand-975/70" />
        <div className="bg-grid absolute inset-0" />
        <div className="animate-drift pointer-events-none absolute -left-24 top-10 h-[26rem] w-[26rem] rounded-full bg-accent-500/16 blur-[110px]" />
        <div className="animate-drift-slow pointer-events-none absolute -right-20 bottom-0 h-[30rem] w-[30rem] rounded-full bg-brand-400/18 blur-[130px]" />

        <Container className="relative py-24 sm:py-28">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div
                className="rise-word mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-300 backdrop-blur-md"
                style={{ "--rise-delay": "80ms" } as React.CSSProperties}
              >
                <span className="ping-dot h-1.5 w-1.5 rounded-full bg-accent-400" />
                Free-to-start realtor lead program
              </div>

              <h1 className="font-display text-[2.85rem] font-bold leading-[1.04] tracking-tight sm:text-6xl lg:text-[4.25rem]">
                {HEADLINE.map((word, i) => (
                  <span key={`${word}-${i}`} className="rise-mask mr-[0.28em]">
                    <span
                      className={`rise-word ${word === "close." ? "text-shimmer" : ""}`}
                      style={{ "--rise-delay": `${180 + i * 85}ms` } as React.CSSProperties}
                    >
                      {word}
                    </span>
                  </span>
                ))}
              </h1>

              <p
                className="rise-word mt-7 max-w-xl text-lg leading-relaxed text-brand-200 sm:text-xl"
                style={{ "--rise-delay": "900ms" } as React.CSSProperties}
              >
                Activate your account for just{" "}
                <strong className="font-semibold text-white">$1</strong>, receive qualified local
                matches, and pay a referral fee only when a referred transaction closes.
              </p>

              <div
                className="rise-word mt-9 flex flex-wrap items-center gap-4"
                style={{ "--rise-delay": "1020ms" } as React.CSSProperties}
              >
                <Link
                  href="/join"
                  className="btn-sheen group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-400 via-accent-500 to-accent-600 px-8 py-4 text-base font-bold text-brand-975 shadow-[0_20px_50px_-16px_rgba(201,164,74,0.85)] transition-all duration-500 hover:shadow-[0_26px_60px_-14px_rgba(201,164,74,0.95)]"
                >
                  Activate for $1
                  <ArrowRight
                    size={18}
                    className="transition-transform duration-500 group-hover:translate-x-1.5"
                  />
                </Link>
                <Link
                  href="/how-it-works"
                  className="group inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/5 px-6 py-4 text-base font-semibold text-white backdrop-blur-md transition-all duration-500 hover:border-white/40 hover:bg-white/12"
                >
                  <PlayCircle
                    size={19}
                    className="text-accent-300 transition-transform duration-500 group-hover:scale-110"
                  />
                  See how it works
                </Link>
              </div>

              <div
                className="rise-word mt-12 flex flex-wrap gap-x-7 gap-y-3"
                style={{ "--rise-delay": "1140ms" } as React.CSSProperties}
              >
                {TRUST_POINTS.map((point) => (
                  <span
                    key={point.label}
                    className="inline-flex items-center gap-2 text-sm font-medium text-brand-200"
                  >
                    <point.icon size={15} className="text-accent-400" />
                    {point.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Floating dashboard preview */}
            <div className="relative mx-auto w-full max-w-md lg:mx-0">
              <div className="animate-float-slow">
                <SpotlightCard
                  className="glass relative overflow-hidden rounded-[2rem] p-6 shadow-[0_50px_120px_-40px_rgba(0,0,0,0.9)]"
                  spotlightColor="rgba(226,197,132,0.22)"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="ping-dot h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-200">
                        New match
                      </span>
                    </div>
                    <span className="rounded-full bg-accent-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-300">
                      Buyer
                    </span>
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-400/15 text-accent-300">
                      <MapPin size={18} />
                    </span>
                    <div>
                      <p className="text-base font-semibold text-white">ZIP 78701 · Austin</p>
                      <p className="text-xs text-brand-300">First-time buyer · Pre-approved</p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-end justify-between">
                      <p className="text-xs uppercase tracking-[0.18em] text-brand-300">
                        Match signals
                      </p>
                      <p className="font-display text-2xl font-bold text-accent-300">7/7</p>
                    </div>
                    <div className="mt-4 flex h-16 items-end gap-1.5">
                      {[42, 66, 54, 88, 72, 96, 80].map((h, i) => (
                        <span
                          key={i}
                          className="bar-grow flex-1 rounded-t-md bg-gradient-to-t from-brand-400/40 to-accent-400"
                          style={
                            { height: `${h}%`, "--bar-delay": `${400 + i * 90}ms` } as React.CSSProperties
                          }
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <div className="flex -space-x-2.5">
                      {AGENT_PORTRAITS.slice(0, 4).map((portrait, i) => (
                        <Image
                          key={i}
                          src={portrait}
                          alt=""
                          placeholder="blur"
                          className="h-9 w-9 rounded-full border-2 border-brand-975 object-cover"
                        />
                      ))}
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-brand-975 bg-accent-500 text-[10px] font-bold text-brand-975">
                        +
                      </span>
                    </div>
                    <span className="text-xs text-brand-300">Eligible agents in area</span>
                  </div>
                </SpotlightCard>
              </div>

              {/* Small floating chips */}
              <div className="animate-float absolute -left-4 bottom-16 hidden rounded-2xl border border-white/12 bg-brand-975/85 px-4 py-3 backdrop-blur-xl sm:block">
                <p className="text-[10px] uppercase tracking-[0.18em] text-brand-300">Activation</p>
                <p className="font-display text-xl font-bold text-white">$1.00</p>
              </div>
              <div
                className="animate-float absolute -right-2 top-10 hidden rounded-2xl border border-white/12 bg-brand-975/85 px-4 py-3 backdrop-blur-xl sm:block"
                style={{ animationDelay: "1.4s" }}
              >
                <p className="text-[10px] uppercase tracking-[0.18em] text-brand-300">Monthly</p>
                <p className="font-display text-xl font-bold text-emerald-400">$0.00</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Marquee                                                           */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-y border-brand-100 bg-brand-50/70 py-6">
        <Marquee duration={48} gap="2.5rem">
          {MARQUEE_TAGS.map((tag) => (
            <span
              key={tag}
              className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-sm font-semibold uppercase tracking-[0.16em] text-brand-500"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
              {tag}
            </span>
          ))}
        </Marquee>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Stats                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative py-20 sm:py-24">
        <div className="bg-grid-light absolute inset-0" />
        <Container className="relative">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 110} y={34}>
                <div className="group relative h-full border-l-2 border-brand-100 pl-6 transition-colors duration-500 hover:border-accent-500">
                  <p className="font-display text-5xl font-bold text-brand-950 sm:text-6xl">
                    <CountUp
                      to={stat.value}
                      prefix={stat.prefix}
                      suffix={stat.suffix}
                      duration={1600 + i * 150}
                    />
                  </p>
                  <p className="mt-3 text-sm font-bold uppercase tracking-[0.16em] text-brand-900">
                    {stat.label}
                  </p>
                  <p className="mt-1.5 text-sm text-brand-500">{stat.detail}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* How it works                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-brand-975 py-24 text-white sm:py-28">
        <div className="bg-grid absolute inset-0" />
        <div className="animate-drift-slow pointer-events-none absolute left-1/3 top-0 h-96 w-96 rounded-full bg-brand-500/12 blur-[120px]" />

        <Container className="relative">
          <Reveal>
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-accent-300">
                <Sparkles size={13} /> How it works
              </p>
              <h2 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
                From a $1 activation to a closed referral — in four steps.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-brand-300">
                Activate, get matched, work the lead, and pay only when a referred transaction
                closes.
              </p>
            </div>
          </Reveal>

          <div className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Connector line behind the cards */}
            <div className="pointer-events-none absolute left-0 right-0 top-[7.5rem] hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent lg:block" />

            {STEPS.map((step, i) => (
              <Reveal key={step.num} delay={i * 130} y={40}>
                <SpotlightCard className="group h-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-sm transition-colors duration-500 hover:border-accent-400/40">
                  <div className="relative h-40 overflow-hidden">
                    <Image
                      src={step.photo}
                      alt=""
                      fill
                      placeholder="blur"
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="img-zoom object-cover opacity-55 transition-opacity duration-700 group-hover:opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-975 via-brand-975/45 to-transparent" />
                    <span className="absolute left-5 top-4 font-display text-5xl font-bold text-white/15 transition-colors duration-500 group-hover:text-accent-400/35">
                      {step.num}
                    </span>
                    <span className="absolute -bottom-6 left-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-500 text-brand-975 shadow-lg shadow-accent-500/25 transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-6">
                      <step.icon size={20} />
                    </span>
                  </div>
                  <div className="p-6 pt-10">
                    <h3 className="font-display text-xl font-bold">{step.title}</h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-brand-300">{step.body}</p>
                  </div>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>

          <Reveal delay={200}>
            <div className="mt-12 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4">
              <Marquee duration={34} gap="1.25rem">
                {["Agent", "$1 activation", "Lead matching", "Appointment", "Under contract", "Closing", "20% referral fee"].map(
                  (node) => (
                    <span
                      key={node}
                      className="flex shrink-0 items-center gap-3 whitespace-nowrap text-sm font-semibold text-brand-200"
                    >
                      {node}
                      <ArrowRight size={14} className="text-accent-400" />
                    </span>
                  ),
                )}
              </Marquee>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Split feature — the dashboard                                     */}
      {/* ---------------------------------------------------------------- */}
      <section className="py-24 sm:py-28">
        <Container>
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <Reveal x={-30} y={20}>
              <div className="img-zoom-host relative">
                <div className="relative overflow-hidden rounded-[2.5rem] shadow-[0_50px_120px_-40px_rgba(11,31,58,0.6)]">
                  <Image
                    src={PHOTOS.modernInterior}
                    alt="Agent reviewing matched opportunities"
                    placeholder="blur"
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="img-zoom h-[30rem] w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-975/70 via-transparent to-transparent" />
                </div>

                <Parallax speed={0.06} className="absolute -bottom-8 -right-4 sm:-right-8">
                  <div className="glass-light w-56 rounded-3xl p-5 shadow-[0_30px_70px_-30px_rgba(11,31,58,0.5)]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500">
                      Referral fee status
                    </p>
                    <div className="mt-3 space-y-2.5">
                      {[
                        { label: "Under contract", done: true },
                        { label: "Closed", done: true },
                        { label: "Fee paid", done: false },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center gap-2.5">
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                              row.done
                                ? "bg-emerald-500 text-white"
                                : "border border-brand-300 text-brand-400"
                            }`}
                          >
                            {row.done ? "✓" : ""}
                          </span>
                          <span className="text-xs font-semibold text-brand-800">{row.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Parallax>

                <Parallax speed={-0.05} className="absolute -left-4 top-10 hidden sm:block">
                  <div className="glass-light rounded-2xl px-4 py-3 shadow-xl">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-500">
                      Active leads
                    </p>
                    <p className="font-display text-2xl font-bold text-brand-950">
                      <CountUp to={12} duration={1400} />
                    </p>
                  </div>
                </Parallax>
              </div>
            </Reveal>

            <Reveal delay={120} x={30} y={20}>
              <SectionHeading
                eyebrow="Your dashboard"
                title="One place for leads, appointments and referral fees."
                subtitle="No spreadsheets and no guesswork. Track every matched opportunity from first contact to the moment the referral fee clears."
              />
              <ul className="space-y-4">
                {[
                  { icon: Zap, text: "Matched opportunities land straight in your queue" },
                  { icon: CalendarCheck, text: "Schedule and track showings, calls and follow-ups" },
                  { icon: TrendingUp, text: "Watch each transaction move to closing in real time" },
                  { icon: ShieldCheck, text: "Referral fee status is visible at every step" },
                ].map((row, i) => (
                  <Reveal key={row.text} delay={200 + i * 90} y={16} blur={3}>
                    <li className="group flex items-start gap-4 rounded-2xl border border-transparent p-3 transition-colors duration-500 hover:border-brand-100 hover:bg-brand-50/60">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-950 text-accent-400 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                        <row.icon size={18} />
                      </span>
                      <span className="pt-2 text-base font-medium text-brand-800">{row.text}</span>
                    </li>
                  </Reveal>
                ))}
              </ul>
              <Link
                href="/for-agents"
                className="group mt-8 inline-flex items-center gap-2 text-base font-bold text-brand-950"
              >
                <span className="link-underline">Explore the agent experience</span>
                <ArrowRight
                  size={17}
                  className="text-accent-600 transition-transform duration-500 group-hover:translate-x-1.5"
                />
              </Link>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Bento — why agents join                                           */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-brand-50/70 py-24 sm:py-28">
        <Container className="relative">
          <Reveal>
            <SectionHeading
              eyebrow="Why agents join"
              title="Pay us when you make money — not before."
              subtitle="Why spend $500–$2,000 on lead packages when you can activate for $1 and let us earn only when you earn?"
              center
            />
          </Reveal>

          <div className="grid auto-rows-[minmax(0,auto)] gap-5 md:grid-cols-6">
            {/* Big feature tile with photo */}
            <Reveal className="md:col-span-4" y={36}>
              <SpotlightCard className="group relative h-full overflow-hidden rounded-[2rem] bg-brand-975 text-white">
                <Image
                  src={PHOTOS.luxuryExterior}
                  alt=""
                  fill
                  placeholder="blur"
                  sizes="(min-width: 768px) 66vw, 100vw"
                  className="img-zoom object-cover opacity-40"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-brand-975 via-brand-975/85 to-transparent" />
                <div className="relative p-9 sm:p-11">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-500 text-brand-975">
                    <Wallet size={22} />
                  </span>
                  <h3 className="mt-6 max-w-md font-display text-3xl font-bold leading-tight sm:text-4xl">
                    No expensive upfront lead packages.
                  </h3>
                  <p className="mt-4 max-w-sm text-base leading-relaxed text-brand-300">
                    Skip the $500–$2,000 bundles that charge you whether or not the lead ever picks
                    up the phone. Start for a one-time $1 activation.
                  </p>
                </div>
              </SpotlightCard>
            </Reveal>

            {/* Pricing highlight tile */}
            <Reveal className="md:col-span-2" delay={110} y={36}>
              <SpotlightCard
                className="flex h-full flex-col justify-between rounded-[2rem] border border-brand-100 bg-white p-8 shadow-[0_30px_70px_-45px_rgba(11,31,58,0.55)]"
                spotlightColor="rgba(201,164,74,0.12)"
              >
                <div>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-100 text-accent-700">
                    <DollarSign size={22} />
                  </span>
                  <h3 className="mt-6 font-display text-2xl font-bold text-brand-950">
                    Simple, honest pricing
                  </h3>
                </div>
                <div className="mt-8 space-y-3">
                  {[
                    { k: "Activation", v: "$1 once" },
                    { k: "Monthly", v: "$0" },
                    { k: "On closing", v: "20%" },
                  ].map((row) => (
                    <div
                      key={row.k}
                      className="flex items-baseline justify-between border-b border-brand-100 pb-2.5 last:border-0"
                    >
                      <span className="text-sm text-brand-500">{row.k}</span>
                      <span className="font-display text-xl font-bold text-brand-950">{row.v}</span>
                    </div>
                  ))}
                </div>
              </SpotlightCard>
            </Reveal>

            {/* Three even tiles */}
            {[
              {
                icon: BadgeCheck,
                title: "Qualified opportunities",
                body: "Buyer and seller opportunities matched to your market, ZIP codes and specialties.",
              },
              {
                icon: MapPin,
                title: "Exclusive local matching",
                body: "Our engine weighs ZIP code, lead type, specialty, availability and capacity.",
              },
              {
                icon: CalendarCheck,
                title: "No monthly subscription",
                body: "Zero recurring software or access fees. You pay only on a closed referral.",
              },
            ].map((tile, i) => (
              <Reveal key={tile.title} className="md:col-span-2" delay={i * 100} y={30}>
                <SpotlightCard
                  className="card-lift h-full rounded-[2rem] border border-brand-100 bg-white p-7 shadow-[0_24px_60px_-45px_rgba(11,31,58,0.5)] hover:border-accent-300 hover:shadow-[0_36px_80px_-45px_rgba(11,31,58,0.55)]"
                  spotlightColor="rgba(201,164,74,0.1)"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-950 text-accent-400">
                    <tile.icon size={19} />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-bold text-brand-950">
                    {tile.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-brand-600">{tile.body}</p>
                </SpotlightCard>
              </Reveal>
            ))}

            {/* Wide tracking tile */}
            <Reveal className="md:col-span-3" delay={120} y={30}>
              <SpotlightCard
                className="card-lift h-full rounded-[2rem] border border-brand-100 bg-white p-7 hover:border-accent-300"
                spotlightColor="rgba(201,164,74,0.1)"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-950 text-accent-400">
                  <TrendingUp size={19} />
                </span>
                <h3 className="mt-5 font-display text-lg font-bold text-brand-950">
                  Referral tracking, end to end
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-brand-600">
                  Follow every referred transaction from under contract, to closing, to fee paid.
                </p>
              </SpotlightCard>
            </Reveal>

            <Reveal className="md:col-span-3" delay={200} y={30}>
              <SpotlightCard
                className="card-lift h-full rounded-[2rem] border border-brand-100 bg-white p-7 hover:border-accent-300"
                spotlightColor="rgba(201,164,74,0.1)"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-950 text-accent-400">
                  <CalendarCheck size={19} />
                </span>
                <h3 className="mt-5 font-display text-lg font-bold text-brand-950">
                  Appointment tracking
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-brand-600">
                  Schedule and track showings and calls without juggling spreadsheets.
                </p>
              </SpotlightCard>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Promise carousel                                                  */}
      {/* ---------------------------------------------------------------- */}
      <section className="py-24 sm:py-28">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="What we commit to" title="Aligned with your closings." center />
          </Reveal>

          <Reveal delay={120}>
            <Carousel
              className="mx-auto max-w-4xl"
              slides={PROMISES.map((promise) => (
                <div
                  key={promise.label}
                  className="grid overflow-hidden rounded-[2.5rem] border border-brand-100 bg-white shadow-[0_40px_90px_-55px_rgba(11,31,58,0.6)] sm:grid-cols-[0.85fr_1.15fr]"
                >
                  <div className="relative h-56 sm:h-auto">
                    <Image
                      src={promise.photo}
                      alt=""
                      fill
                      placeholder="blur"
                      sizes="(min-width: 640px) 40vw, 100vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-975/45 to-transparent" />
                  </div>
                  <div className="flex flex-col justify-center p-8 sm:p-11">
                    <Quote size={30} className="text-accent-400" />
                    <p className="mt-5 font-display text-xl leading-relaxed text-brand-950 sm:text-2xl">
                      {promise.quote}
                    </p>
                    <p className="mt-6 text-xs font-bold uppercase tracking-[0.24em] text-accent-600">
                      {promise.label}
                    </p>
                  </div>
                </div>
              ))}
            />
          </Reveal>
        </Container>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Pricing                                                           */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-brand-975 py-24 text-white sm:py-28">
        <div className="bg-grid absolute inset-0" />
        <div className="animate-drift pointer-events-none absolute -right-20 top-10 h-[28rem] w-[28rem] rounded-full bg-accent-500/14 blur-[130px]" />

        <Container className="relative">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <Reveal>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-accent-300">
                Pricing
              </p>
              <h2 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
                One dollar in. <span className="text-shimmer">Twenty percent</span> only when it
                closes.
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-brand-300">
                No monthly fee, no lead packages, no minimum spend. The referral fee applies to
                referred transactions that close, per the signed referral agreement.
              </p>
              <div className="mt-9 space-y-3">
                {[
                  "One-time $1 account activation",
                  "$0 per month, forever",
                  "20% referral fee on closed referred transactions",
                  "Cancel-free — nothing recurring to cancel",
                ].map((line, i) => (
                  <Reveal key={line} delay={140 + i * 80} y={14} blur={3}>
                    <div className="flex items-start gap-3">
                      <BadgeCheck size={19} className="mt-0.5 shrink-0 text-accent-400" />
                      <span className="text-base text-brand-200">{line}</span>
                    </div>
                  </Reveal>
                ))}
              </div>
            </Reveal>

            <Reveal delay={160} y={40}>
              <SpotlightCard
                className="glass relative mx-auto w-full max-w-md overflow-hidden rounded-[2.5rem] p-1"
                spotlightColor="rgba(226,197,132,0.2)"
              >
                <div className="rounded-[2.25rem] bg-gradient-to-b from-white/[0.06] to-transparent p-9 text-center">
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent-300">
                    Agent program
                  </p>

                  <div className="mt-8 flex items-end justify-center gap-1.5">
                    <span className="pb-3 font-display text-2xl font-medium text-brand-300">$</span>
                    <span className="font-display text-[6rem] font-bold leading-none text-white">
                      1
                    </span>
                    <span className="pb-4 text-sm font-medium text-brand-300">once</span>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                      <p className="font-display text-2xl font-bold text-emerald-400">$0</p>
                      <p className="mt-1 text-[11px] uppercase tracking-wider text-brand-300">
                        Per month
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                      <p className="font-display text-2xl font-bold text-accent-300">20%</p>
                      <p className="mt-1 text-[11px] uppercase tracking-wider text-brand-300">
                        On closing
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/join"
                    className="btn-sheen group mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent-400 via-accent-500 to-accent-600 px-6 py-4 text-base font-bold text-brand-975 shadow-[0_20px_50px_-18px_rgba(201,164,74,0.9)] transition-all duration-500"
                  >
                    Activate my account
                    <ArrowRight
                      size={17}
                      className="transition-transform duration-500 group-hover:translate-x-1.5"
                    />
                  </Link>
                  <p className="mt-4 text-xs leading-relaxed text-brand-400">
                    One-time activation · No monthly fee · No lead packages
                  </p>
                </div>
              </SpotlightCard>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* FAQ preview                                                       */}
      {/* ---------------------------------------------------------------- */}
      <section className="py-24 sm:py-28">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <Reveal>
              <SectionHeading eyebrow="Questions" title="The short answers." />
              <p className="text-base leading-relaxed text-brand-600">
                Still deciding? These are the three things agents ask before activating.
              </p>
              <Link
                href="/faq"
                className="group mt-6 inline-flex items-center gap-2 text-base font-bold text-brand-950"
              >
                <span className="link-underline">Read the full FAQ</span>
                <ArrowRight
                  size={17}
                  className="text-accent-600 transition-transform duration-500 group-hover:translate-x-1.5"
                />
              </Link>
            </Reveal>

            <Reveal delay={140}>
              <div className="space-y-3">
                {FAQ_PREVIEW.map((item, i) => (
                  <details
                    key={item.q}
                    open={i === 0}
                    className="group rounded-2xl border border-brand-100 bg-white px-6 py-5 transition-colors duration-500 open:border-accent-300 open:shadow-[0_24px_60px_-40px_rgba(11,31,58,0.5)]"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-brand-950 marker:hidden">
                      {item.q}
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg text-brand-700 transition-all duration-500 group-open:rotate-45 group-open:bg-brand-950 group-open:text-accent-400">
                        +
                      </span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-brand-600">{item.a}</p>
                  </details>
                ))}
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Final CTA                                                         */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-brand-975 text-white">
        <Image
          src={PHOTOS.citySkyline}
          alt=""
          fill
          placeholder="blur"
          sizes="100vw"
          className="animate-kenburns object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-975/85 via-brand-975/80 to-brand-975" />
        <div className="bg-grid absolute inset-0" />

        <Container className="relative flex flex-col items-center gap-7 py-28 text-center">
          <Reveal>
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/12 bg-white/5 text-accent-400 backdrop-blur-md">
              <ShieldCheck size={30} />
            </span>
          </Reveal>
          <Reveal delay={100}>
            <h2 className="max-w-3xl font-display text-4xl font-bold leading-tight sm:text-5xl">
              Qualified opportunities. Clear terms. <span className="text-shimmer">No upfront cost.</span>
            </h2>
          </Reveal>
          <Reveal delay={180}>
            <p className="max-w-xl text-lg text-brand-300">
              Activate your account in minutes. After review and approval, matched opportunities
              start arriving in your dashboard.
            </p>
          </Reveal>
          <Reveal delay={260}>
            <Link
              href="/join"
              className="btn-sheen group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-400 via-accent-500 to-accent-600 px-9 py-4 text-base font-bold text-brand-975 shadow-[0_22px_55px_-18px_rgba(201,164,74,0.9)] transition-all duration-500"
            >
              Activate for $1
              <ArrowRight
                size={18}
                className="transition-transform duration-500 group-hover:translate-x-1.5"
              />
            </Link>
          </Reveal>
          <p className="max-w-2xl text-xs leading-relaxed text-brand-400">
            Leads are not guaranteed. Referral fees apply to referred transactions that close, per
            the signed referral agreement and applicable law.
          </p>
        </Container>
      </section>
    </div>
  );
}
