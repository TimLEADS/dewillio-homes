import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";
import { Container } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { PHOTOS } from "@/lib/images";

const LINK_GROUPS = [
  {
    heading: "Program",
    links: [
      { href: "/how-it-works", label: "How It Works" },
      { href: "/for-agents", label: "For Agents" },
      { href: "/lead-program", label: "Lead Program" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    heading: "Account",
    links: [
      { href: "/join", label: "Activate for $1" },
      { href: "/login", label: "Agent Log in" },
      { href: "/lead-program#referral-agreement", label: "Referral Agreement" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-brand-100 bg-brand-50/60">
      <Container className="space-y-14 py-16">
        {/* CTA banner */}
        <Reveal y={30}>
          <div className="group relative overflow-hidden rounded-[2.5rem] bg-brand-975 px-7 py-12 text-white shadow-[0_45px_100px_-50px_rgba(11,31,58,0.9)] sm:px-12">
            <Image
              src={PHOTOS.openHouse}
              alt=""
              fill
              placeholder="blur"
              sizes="(min-width: 1280px) 1200px, 100vw"
              className="img-zoom object-cover opacity-25"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-brand-975 via-brand-975/90 to-brand-975/45" />
            <div className="bg-grid absolute inset-0" />
            <div className="animate-drift pointer-events-none absolute -right-10 -top-16 h-72 w-72 rounded-full bg-accent-500/18 blur-[100px]" />

            <div className="relative flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-accent-300">
                  Ready for real lead flow?
                </p>
                <p className="mt-4 max-w-lg font-display text-3xl font-bold leading-tight sm:text-4xl">
                  One-time activation. Qualified matches. Better closings.
                </p>
              </div>
              <Link
                href="/join"
                className="btn-sheen inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent-400 via-accent-500 to-accent-600 px-7 py-4 text-base font-bold text-brand-975 shadow-[0_20px_50px_-18px_rgba(201,164,74,0.9)] transition-all duration-500"
              >
                Activate for $1
                <ArrowRight size={17} className="transition-transform duration-500 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </Reveal>

        {/* Link columns */}
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="group inline-flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-950 text-accent-400 transition-transform duration-500 group-hover:-rotate-6">
                <Home size={18} />
              </span>
              <span className="font-display text-lg font-bold text-brand-950">
                Dewilio<span className="text-accent-500"> Homes</span>
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-brand-600">
              Free-to-start real estate referral program. Activate for $1, get matched with
              qualified opportunities, and pay a 20% referral fee only when a referred transaction
              closes.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {["$1 once", "$0 / month", "20% on closing"].map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-700"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          {LINK_GROUPS.map((group) => (
            <div key={group.heading}>
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.24em] text-brand-950">
                {group.heading}
              </p>
              <ul className="space-y-3 text-sm text-brand-600">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-block transition-all duration-300 hover:translate-x-1 hover:text-accent-600"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-brand-100 pt-8 text-sm leading-relaxed text-brand-500">
          <p>
            Dewilio Homes is a real estate referral program. The $1 activation fee is a one-time
            account activation charge — it is not a subscription. Leads are not guaranteed. A 20%
            referral fee applies to referred transactions that close, according to the signed
            referral agreement and applicable state and brokerage rules.
          </p>
          <p className="mt-5 text-xs text-brand-400">
            © {new Date().getFullYear()} Dewilio Homes. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
