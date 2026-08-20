"use client";

import { useEffect, useState } from "react";

export interface ActivationSnapshot {
  stage: string;
  destination: string;
}

/** How often the applicant's screen re-checks where the admin has routed them. */
const POLL_MS = 2500;

/**
 * Live activation stage for the logged-in applicant: a short poll of
 * `/api/activation/status`, so the loading screen turns over within a couple of
 * seconds of the admin's decision.
 *
 * This used to be a Server-Sent Events stream. On a serverless deployment each
 * open stream pins a function invocation (and the database connection behind
 * it) for as long as the applicant sits on the screen, so a few simultaneous
 * applicants could hold the platform's whole concurrency budget and the site
 * would stop answering. The stream also could not see a decision made on
 * another container, so it fell back to polling the database anyway — the push
 * bought nothing that this doesn't. A single indexed row read every couple of
 * seconds is cheap, and the request is over in milliseconds.
 *
 * The poll pauses while the tab is hidden and fires once immediately when it
 * comes back, so a backgrounded screen costs nothing and catches up at once.
 */
export function useActivationLive(): ActivationSnapshot | null {
  const [snap, setSnap] = useState<ActivationSnapshot | null>(null);

  useEffect(() => {
    let stopped = false;
    let inFlight = false;

    const check = async () => {
      if (stopped || inFlight) return;
      if (typeof document !== "undefined" && document.hidden) return;
      inFlight = true;
      try {
        const res = await fetch("/api/activation/status", { cache: "no-store" });
        if (res.ok && !stopped) setSnap((await res.json()) as ActivationSnapshot);
      } catch {
        /* offline for a beat — the next tick tries again */
      } finally {
        inFlight = false;
      }
    };

    void check();
    const poll = setInterval(check, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return snap;
}
