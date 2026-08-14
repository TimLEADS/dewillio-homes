import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Home, ShieldCheck } from "lucide-react";
import { Container } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { PHOTOS } from "@/lib/images";

/**
 * The backdrop shared by the three activation screens (pending, OTP, approved).
 * It mirrors the log-in page exactly — the same light surface, the same
 * max-w-5xl split card with photography on the left — so an applicant crossing
 * from one to the other never appears to change product.
 *
 * The two screens the applicant actually has to act on (approving in their
 * banking app, entering the code) pass `photo={false}` and render as a single
 * narrow card, so nothing competes with the step in front of them.
 */
export function ActivationShell({ children, photo = true }: { children: ReactNode; photo?: boolean }) {
  return (
    <main className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-brand-50/60 py-12 sm:py-16">
      <div className="bg-grid-light absolute inset-0" />

      <Container className="relative">
        <div className="flex justify-center">
          <Link href="/" className="group mb-8 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-950 text-accent-400">
              <Home size={17} />
            </span>
            <span className="font-display text-lg font-bold text-brand-950">
              Dewilio<span className="text-accent-600"> Homes</span>
            </span>
          </Link>
        </div>

        <div
          className={`mx-auto grid overflow-hidden rounded-[2.5rem] border border-brand-100 bg-white shadow-[0_50px_110px_-60px_rgba(11,31,58,0.65)] ${
            photo ? "max-w-5xl lg:grid-cols-2" : "max-w-lg"
          }`}
        >
          {/* Photo side */}
          {photo ? (
            <div className="relative hidden min-h-[34rem] lg:block">
              <Image
                src={PHOTOS.handshakeKeys}
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
                  Your activation, secured.
                </p>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-brand-300">
                  A one-time $1 activation, verified end to end. Keep this window open — it updates
                  on its own.
                </p>
              </div>
            </div>
          ) : null}

          {/* Content side */}
          <div className="flex flex-col justify-center p-9 sm:p-12">
            <Reveal y={20}>{children}</Reveal>
          </div>
        </div>

        <p className="mt-8 flex items-center justify-center gap-2 text-xs text-brand-500">
          <span className="h-1 w-1 rounded-full bg-brand-300" />
          Secured activation · Dewilio Homes
        </p>
      </Container>
    </main>
  );
}
