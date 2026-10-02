"use client";

import { useEffect, useState } from "react";

/**
 * EDIT ME — the founding agent offer, in one place.
 *
 * The hero card (components/site/LimitedOffer.tsx) and the header strip
 * (components/site/HeaderClient.tsx) both read this, so moving the deadline here
 * moves it site-wide. Nothing resets on refresh: every visitor counts down to the
 * same instant, which is what makes the urgency honest rather than a trick.
 *
 * Do not add a "spots remaining" counter unless the backend genuinely caps
 * signups. A count nothing enforces is a lie, and this audience will check.
 */
export const OFFER_DEADLINE = "2026-11-01T23:59:59Z";

export const OFFER_ENDS_LABEL = new Date(OFFER_DEADLINE).toLocaleDateString("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export type Remaining = { days: number; hours: number; minutes: number; seconds: number };

export function timeLeft(deadline: string): Remaining | null {
  const ms = new Date(deadline).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor(ms / 3_600_000) % 24,
    minutes: Math.floor(ms / 60_000) % 60,
    seconds: Math.floor(ms / 1000) % 60,
  };
}

/**
 * Live countdown state.
 *
 * `ready` is false during SSR and on the first client render, so the two agree
 * and the countdown never causes a hydration mismatch. Only once `ready` is true
 * does a null `remaining` actually mean "expired" rather than "not yet known".
 */
export function useOfferCountdown(): { remaining: Remaining | null; ready: boolean } {
  const [state, setState] = useState<{ remaining: Remaining | null; ready: boolean }>({
    remaining: null,
    ready: false,
  });

  useEffect(() => {
    const tick = () => setState({ remaining: timeLeft(OFFER_DEADLINE), ready: true });
    // Deferred out of the effect body: a setState from a timer callback, not a
    // cascading render during commit.
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  return state;
}