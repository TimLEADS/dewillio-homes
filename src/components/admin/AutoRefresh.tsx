"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Quietly re-fetches the server component on an interval, for live admin views.
 * Skips the refresh while the tab is hidden, so a forgotten background tab does
 * not keep re-running the page's queries against the database indefinitely.
 */
export function AutoRefresh({ seconds = 8 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
