import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";
import { Container } from "@/components/ui";

/**
 * Shared photo hero for the inner marketing pages.
 * Keeps every page opening on the same rhythm: photo → scrim → grid → copy.
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  photo,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  photo: StaticImageData;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-brand-975 text-white">
      <Image
        src={photo}
        alt=""
        fill
        priority
        placeholder="blur"
        sizes="100vw"
        className="animate-kenburns object-cover opacity-35"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-brand-975/90 via-brand-975/80 to-brand-975" />
      <div className="bg-grid absolute inset-0" />
      <div className="animate-drift pointer-events-none absolute -left-20 top-0 h-80 w-80 rounded-full bg-accent-500/14 blur-[110px]" />
      <div className="animate-drift-slow pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-brand-400/16 blur-[110px]" />

      <Container className="relative py-24 text-center sm:py-28">
        {eyebrow ? (
          <p
            className="rise-word mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-accent-300 backdrop-blur-md"
            style={{ "--rise-delay": "60ms" } as React.CSSProperties}
          >
            {eyebrow}
          </p>
        ) : null}

        <h1
          className="rise-word mx-auto max-w-4xl font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl"
          style={{ "--rise-delay": "150ms" } as React.CSSProperties}
        >
          {title}
        </h1>

        {subtitle ? (
          <p
            className="rise-word mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-brand-300"
            style={{ "--rise-delay": "300ms" } as React.CSSProperties}
          >
            {subtitle}
          </p>
        ) : null}

        {children ? (
          <div
            className="rise-word mt-10"
            style={{ "--rise-delay": "420ms" } as React.CSSProperties}
          >
            {children}
          </div>
        ) : null}
      </Container>
    </section>
  );
}
