import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { Container } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { PHOTOS } from "@/lib/images";

// Reachable without an account, but not a page that should rank: it has no
// content for a searcher, and ranking it above the homepage would send people
// to a password prompt.
export const metadata: Metadata = {
  title: "Log In",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return (
    <section className="relative overflow-hidden bg-brand-50/60 py-16 sm:py-24">
      <div className="bg-grid-light absolute inset-0" />

      <Container className="relative">
        <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2.5rem] border border-brand-100 bg-white shadow-[0_50px_110px_-60px_rgba(11,31,58,0.65)] lg:grid-cols-2">
          {/* Photo side */}
          <div className="relative hidden min-h-[34rem] lg:block">
            <Image
              src={PHOTOS.modernInterior}
              alt=""
              fill
              placeholder="blur"
              sizes="50vw"
              className="animate-kenburns object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-975 via-brand-975/60 to-brand-975/20" />
            <div className="absolute inset-x-0 bottom-0 p-10 text-white">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-accent-400 backdrop-blur-md">
                <ShieldCheck size={22} />
              </span>
              <p className="mt-6 font-display text-3xl font-bold leading-tight">
                Your pipeline, in one place.
              </p>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-brand-300">
                Leads, appointments, transactions and referral fee status — all tracked from first
                contact to closing.
              </p>
            </div>
          </div>

          {/* Form side */}
          <div className="flex flex-col justify-center p-9 sm:p-12">
            <Reveal y={20}>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-accent-600">
                Welcome back
              </p>
              <h1 className="mt-3 font-display text-3xl font-bold text-brand-950">Agent log in</h1>
              <p className="mt-2 mb-8 text-sm leading-relaxed text-brand-600">
                Access your dashboard, leads and referral fees.
              </p>

              <LoginForm />

              <Link
                href="/join"
                className="group mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-950"
              >
                <span className="link-underline">No account yet? Activate for $1</span>
                <ArrowRight
                  size={15}
                  className="text-accent-600 transition-transform duration-500 group-hover:translate-x-1"
                />
              </Link>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
