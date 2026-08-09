"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Fires once when the element first scrolls into view.
 * Falls back to "immediately visible" when IntersectionObserver is missing.
 */
function useInView<T extends HTMLElement>(
  onEnter: (el: T) => void,
  { once = true, threshold = 0.15 }: { once?: boolean; threshold?: number } = {},
) {
  const ref = useRef<T | null>(null);
  const handler = useRef(onEnter);
  handler.current = onEnter;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      handler.current(el);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          handler.current(el);
          if (once) io.unobserve(el);
        }
      },
      { threshold, rootMargin: "0px 0px -6% 0px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [once, threshold]);

  return ref;
}

/* ------------------------------------------------------------------ */
/* Reveal — fade + slide + unblur as the block enters the viewport      */
/* ------------------------------------------------------------------ */

export function Reveal({
  children,
  className = "",
  delay = 0,
  y = 28,
  x = 0,
  scale = 1,
  blur = 8,
  style,
}: {
  children: ReactNode;
  className?: string;
  /** ms */
  delay?: number;
  y?: number;
  x?: number;
  scale?: number;
  blur?: number;
  style?: CSSProperties;
}) {
  const ref = useInView<HTMLDivElement>((el) => {
    el.dataset.reveal = "in";
  });

  return (
    <div
      ref={ref}
      data-reveal="out"
      className={className}
      style={
        {
          "--reveal-delay": `${delay}ms`,
          "--reveal-y": `${y}px`,
          "--reveal-x": `${x}px`,
          "--reveal-scale": scale,
          "--reveal-blur": `${blur}px`,
          ...style,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CountUp — animated number, starts when scrolled into view            */
/* ------------------------------------------------------------------ */

export function CountUp({
  to,
  from = 0,
  duration = 1800,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
}: {
  to: number;
  from?: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const [value, setValue] = useState(from);
  const started = useRef(false);

  const ref = useInView<HTMLSpanElement>(() => {
    if (started.current) return;
    started.current = true;

    if (prefersReducedMotion()) {
      setValue(to);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutExpo
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* SpotlightCard — radial highlight that follows the pointer            */
/* ------------------------------------------------------------------ */

export function SpotlightCard({
  children,
  className = "",
  spotlightColor,
}: {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const onMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    el.style.setProperty("--my", `${event.clientY - rect.top}px`);
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={`spotlight ${className}`}
      style={spotlightColor ? ({ "--spotlight-color": spotlightColor } as CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Marquee — seamless infinite scroller, pauses on hover                */
/* ------------------------------------------------------------------ */

export function Marquee({
  children,
  duration = 42,
  reverse = false,
  gap = "3rem",
  className = "",
}: {
  children: ReactNode;
  /** seconds for one full pass */
  duration?: number;
  reverse?: boolean;
  gap?: string;
  className?: string;
}) {
  const style = {
    "--marquee-duration": `${duration}s`,
    "--marquee-gap": gap,
    "--marquee-direction": reverse ? "reverse" : "normal",
  } as CSSProperties;

  return (
    <div className={`marquee ${className}`} style={style}>
      <div className="marquee__track">{children}</div>
      <div className="marquee__track" aria-hidden="true">
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ScrollProgress — thin bar showing how far down the page you are      */
/* ------------------------------------------------------------------ */

export function ScrollProgress({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      el.style.setProperty("--progress", `${ratio}`);
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`scroll-progress h-full w-full bg-gradient-to-r from-accent-500 via-accent-400 to-brand-400 ${className}`}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Accordion — animated FAQ list                                        */
/* ------------------------------------------------------------------ */

export function Accordion({
  items,
  defaultOpen = 0,
}: {
  items: { q: string; a: string }[];
  defaultOpen?: number | null;
}) {
  const [open, setOpen] = useState<number | null>(defaultOpen);

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <Reveal key={item.q} delay={i * 60} y={18} blur={4}>
            <div
              className={`overflow-hidden rounded-2xl border transition-colors duration-500 ${
                isOpen
                  ? "border-accent-300 bg-white shadow-[0_24px_60px_-30px_rgba(11,31,58,0.5)]"
                  : "border-brand-100 bg-white/70 hover:border-brand-300"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full cursor-pointer items-center justify-between gap-4 px-6 py-5 text-left"
              >
                <span className="text-base font-semibold text-brand-950">{item.q}</span>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg leading-none transition-all duration-500 ${
                    isOpen
                      ? "rotate-45 bg-brand-950 text-accent-400"
                      : "bg-brand-50 text-brand-600"
                  }`}
                >
                  +
                </span>
              </button>
              <div className="accordion-panel px-6" data-open={isOpen}>
                <div>
                  <p className="pb-6 text-sm leading-relaxed text-brand-600">{item.a}</p>
                </div>
              </div>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Carousel — auto-advancing slider for testimonials                    */
/* ------------------------------------------------------------------ */

export function Carousel({
  slides,
  interval = 6000,
  className = "",
}: {
  slides: ReactNode[];
  interval?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  useEffect(() => {
    if (paused || count <= 1 || prefersReducedMotion()) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => clearInterval(id);
  }, [paused, count, interval]);

  return (
    <div
      className={className}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <div key={i} className="w-full shrink-0 px-1" aria-hidden={i !== index}>
              {slide}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2.5">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Go to testimonial ${i + 1}`}
            className={`h-2 cursor-pointer rounded-full transition-all duration-500 ${
              i === index ? "w-8 bg-accent-500" : "w-2 bg-brand-200 hover:bg-brand-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Parallax — gentle vertical drift tied to scroll position             */
/* ------------------------------------------------------------------ */

export function Parallax({
  children,
  speed = 0.14,
  className = "",
}: {
  children: ReactNode;
  /** 0 = static, 0.3 = strong */
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * speed;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [speed]);

  return (
    <div ref={ref} className={className} style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}
