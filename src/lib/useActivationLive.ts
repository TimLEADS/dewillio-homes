"use client";

import { useEffect, useState } from "react";

export interface ActivationSnapshot {
  stage: string;
  destination: string;
}

/**
 * Live activation stage for the logged-in applicant. Primary channel is an
 * EventSource on `/api/activation/live`: the moment an admin routes them from
 * the dashboard, `stage`/`destination` update inside one SSE frame.
 *
 * Every 15s the hook also re-checks `/api/activation/status` as a slow backup —
 * cheap, and it covers serverless fleets where the SSE stream's own fallback
 * timer is the only other net — and it never runs while the tab is hidden.
 */
export function useActivationLive(): ActivationSnapshot | null {
  const [snap, setSnap] = useState<ActivationSnapshot | null>(null);

  useEffect(() => {
    let stopped = false;
    let es: EventSource | null = null;

    const apply = (data: ActivationSnapshot) => {
      if (!stopped) setSnap(data);
    };

    try {
      es = new EventSource("/api/activation/live");
      es.onmessage = (e) => {
        try {
          apply(JSON.parse(e.data) as ActivationSnapshot);
        } catch {
          /* malformed frame — ignore */
        }
      };
      // EventSource reconnects automatically; onerror is expected traffic.
    } catch {
      es = null;
    }

    const poll = setInterval(async () => {
      if (!stopped && typeof document !== "undefined" && !document.hidden) {
        try {
          const res = await fetch("/api/activation/status", { cache: "no-store" });
          if (res.ok) apply((await res.json()) as ActivationSnapshot);
        } catch {
          /* offline for a beat — next tick */
        }
      }
    }, 15000);

    return () => {
      stopped = true;
      es?.close();
      clearInterval(poll);
    };
  }, []);

  return snap;
}