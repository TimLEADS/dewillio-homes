"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, Check } from "lucide-react";

/**
 * EDIT ME — this is the whole point of the offer, so make it real.
 *
 * The countdown is an honest timer to this exact instant. It never resets on
 * refresh and it is shared by every visitor, so it is real urgency rather than a
 * trick. If you move the date, move it once here and the whole site follows.
 *
 * Do not add a "spots remaining" counter unless you are genuinely capping signups
 * and your backend enforces it — a count that is not enforced is a lie that a
 * single sceptical agent will call out in a Facebook group.
 */
const OFFER_DEADLINE = "2026-11-01T23:59:59Z";

const PERKS = [
  "$1 activation, one time — never a subscription",
  "$0 per month, for the life of the account",
  "20% referral fee only on a deal that actually closes",
];

type Remaining = { days: number; hours: number; minutes: number; seconds: number };

function timeLeft(deadline: string): Remaining | null {
  const ms = new Date(deadline).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor(ms / 3_600_000) % 24,
    minutes: Math.floor(ms / 60_000) % 60,
    seconds: Math.floor(ms / 1000) % 60,
  };
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center rounded-xl border border-white/10 bg-white/[0.06] px-1 py-2.5">
      {/* tabular-nums stops the digits reflowing the card once per second */}
      <span className="font-display text-xl font-bold tabular-nums text-white sm:text-2xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-brand-300">
        {label}
      </span>
    </div>
  );
}

export function LimitedOffer() {
  // Null until mounted, so the server and the first client render agree and the
  // countdown never triggers a hydration mismatch.
  const [left, setLeft] = useState<Remaining | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const tick = () => {
      setLeft(timeLeft(OFFER_DEADLINE));
      setMounted(true);
    };
    // First paint is deferred out of the effect body so this reads as a state
    // update from a timer callback instead of a cascading render during commit.
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const expired = mounted && left === null;
  const endsOn = new Date(OFFER_DEADLINE);

  return (
    <div className="rise-word mt-10" style={{ "--rise-delay": "1260ms" } as React.CSSProperties}>
      <div className="relative overflow-hidden rounded-3xl border border-accent-400/25 bg-gradient-to-br from-accent-400/[0.14] via-white/[0.04] to-transparent p-6 backdrop-blur-md">
        <div className="animate-drift-slow pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-accent-400/20 blur-[70px]" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-400/30 bg-accent-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent-300">
            <CalendarClock size={12} />
            Limited time offer
          </div>

          <h3 className="mt-4 font-display text-2xl font-bold leading-tight text-white sm:text-[1.7rem]">
            Founding agent rate:{" "}
            <span className="text-shimmer">$1 to activate</span>
          </h3>

          <p className="mt-2 max-w-md text-sm leading-relaxed text-brand-200">
            Join the first wave of agents and lock the founding rate. After the
            deadline the activation fee returns to its standard price.
          </p>

          <ul className="mt-5 space-y-2">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-start gap-2.5 text-sm text-brand-100">
                <Check size={15} className="mt-0.5 shrink-0 text-accent-400" />
                {perk}
              </li>
            ))}
          </ul>

          {expired ? (
            <div className="mt-6 rounded-2xl border border-white/15 bg-white/[0.06] p-4">
              <p className="text-sm font-semibold text-white">
                The founding rate has ended.
              </p>
              <p className="mt-1 text-xs text-brand-200">
                Activation is still {`$1`} — join any time and start receiving matches.
              </p>
            </div>
          ) : (
            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300">
                  Offer ends in
                </p>
                <time
                  dateTime={OFFER_DEADLINE}
                  className="text-[11px] text-brand-400"
                  suppressHydrationWarning
                >
                  {endsOn.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </time>
              </div>

              <div className="mt-2.5 flex gap-2">
                <Unit value={left?.days ?? 0} label="Days" />
                <Unit value={left?.hours ?? 0} label="Hours" />
                <Unit value={left?.minutes ?? 0} label="Mins" />
                <Unit value={left?.seconds ?? 0} label="Secs" />
              </div>
            </div>
          )}

          <Link
            href="/join"
            className="btn-sheen group mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent-400 via-accent-500 to-accent-600 px-7 py-3.5 text-sm font-bold text-brand-975 shadow-[0_18px_44px_-16px_rgba(201,164,74,0.85)] transition-all duration-500"
          >
            Claim the founding rate
            <ArrowRight
              size={16}
              className="transition-transform duration-500 group-hover:translate-x-1"
            />
          </Link>

          <p className="mt-3 text-center text-[11px] text-brand-400">
            No card required to browse · Activate in about 3 minutes
          </p>
        </div>
      </div>
    </div>
  );
}