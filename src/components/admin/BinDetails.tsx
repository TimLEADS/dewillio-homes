"use client";

import { useEffect, useReducer, type ReactNode } from "react";
import { Landmark } from "lucide-react";
import { lookupIssuer } from "@/lib/issuers";

/**
 * Full BIN report for a card, shown beside the number in the admin panel.
 *
 * The BankTag next to the number only knows the prefixes hand-listed in
 * `src/lib/issuers.ts`. This asks a live BIN database (see the route at
 * `/api/admin/bin`) and prints what it knows about the issuer: bank, scheme,
 * debit or credit, prepaid, and the country the card was issued in.
 *
 * Everything is cached per BIN in this module, so a table of thirty payments
 * from six banks makes six requests, and re-renders make none. When the lookup
 * comes back empty or the provider is throttled, the panel falls back to the
 * local issuer list rather than showing an error — the number itself is still
 * on screen either way.
 */

export interface BinInfo {
  scheme: string | null;
  type: string | null;
  brand: string | null;
  prepaid: boolean | null;
  bank: string | null;
  country: string | null;
  countryEmoji: string | null;
}

/** A settled answer. "none" covers both "no such BIN" and "provider down". */
type Outcome = { state: "ok"; info: BinInfo } | { state: "none" };

/** What a caller renders from: an outcome, or one of the two waiting states. */
type Result = Outcome | { state: "idle" } | { state: "loading" };

/**
 * `staleAt` is what separates a real answer from a failed one: a bank keeps its
 * BIN for years, so a hit or a confirmed miss stands for as long as the page is
 * open, while a throttled provider is worth asking again in a minute.
 */
const CACHE = new Map<string, { outcome: Outcome; staleAt: number }>();
const INFLIGHT = new Map<string, Promise<void>>();
const RETRY_MS = 60_000;

function readCache(bin: string): Outcome | null {
  const entry = CACHE.get(bin);
  if (!entry) return null;
  return Date.now() < entry.staleAt ? entry.outcome : null;
}

async function lookup(bin: string): Promise<void> {
  const running = INFLIGHT.get(bin);
  if (running) return running;

  const request = (async () => {
    let outcome: Outcome = { state: "none" };
    let staleAt = Date.now() + RETRY_MS;
    try {
      const res = await fetch(`/api/admin/bin?bin=${bin}`, { cache: "no-store" });
      const data = (await res.json()) as { status?: string; info?: BinInfo };
      if (data.status === "ok" && data.info) {
        outcome = { state: "ok", info: data.info };
        staleAt = Infinity;
      } else if (data.status === "not_found") {
        staleAt = Infinity;
      }
    } catch {
      // Keep the default: a "none" that expires, so the next render retries.
    }
    CACHE.set(bin, { outcome, staleAt });
    INFLIGHT.delete(bin);
  })();

  INFLIGHT.set(bin, request);
  return request;
}

/** First six digits of whatever has been typed or stored, or null if too short. */
function binOf(cardNumber: string | null | undefined): string | null {
  const digits = String(cardNumber ?? "").replace(/\D/g, "");
  return digits.length >= 6 ? digits.slice(0, 6) : null;
}

/**
 * The result is read straight out of the cache at render time rather than
 * mirrored into state, so a BIN another row already looked up paints instantly
 * and no render is spent moving the answer into this component. The counter
 * exists only to schedule the repaint once a request lands.
 */
function useBinLookup(cardNumber: string | null | undefined) {
  const bin = binOf(cardNumber);
  const [version, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!bin || readCache(bin)) return;
    let cancelled = false;
    void lookup(bin).then(() => {
      // A late answer for a BIN the live panel has already typed past must not
      // repaint this component with the wrong card's issuer.
      if (!cancelled) bump();
    });
    return () => {
      cancelled = true;
    };
    // `version` re-runs this once after a request settles; that pass finds the
    // cache filled and returns, so it cannot loop.
  }, [bin, version]);

  const result: Result = !bin ? { state: "idle" } : (readCache(bin) ?? { state: "loading" });
  return { bin, result };
}

/** "visa" / "DEBIT" as printed on a card: Visa, Debit. */
function titled(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/** Scheme, card type and prepaid flag as one line: "Visa · Debit · Prepaid". */
function describe(info: BinInfo): string | null {
  const parts = [titled(info.scheme), titled(info.type), info.prepaid ? "Prepaid" : null].filter(
    Boolean
  ) as string[];
  return parts.length ? parts.join(" · ") : null;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-[11px] text-brand-400">{label}</span>
      <span className="min-w-0 truncate text-right text-xs font-medium text-brand-800">{children}</span>
    </div>
  );
}

/**
 * The panel form — a boxed report, sized to sit to the right of a card.
 * `className` is where the caller puts its width and spacing.
 */
export function BinDetails({
  cardNumber,
  className = "",
}: {
  cardNumber: string | null | undefined;
  className?: string;
}) {
  const { bin, result } = useBinLookup(cardNumber);
  const local = lookupIssuer(cardNumber)?.name ?? null;

  if (!bin) {
    return (
      <div className={`rounded-xl border border-dashed border-brand-200 p-3 ${className}`}>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-300">BIN check</p>
        <p className="mt-1.5 text-xs text-brand-400">
          Waiting for the first six digits — the bank names itself from there.
        </p>
      </div>
    );
  }

  const info = result.state === "ok" ? result.info : null;
  const bank = info?.bank ?? local;
  const line = info ? describe(info) : null;

  return (
    <div className={`rounded-xl border border-brand-100 bg-white p-3 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-400">
          <Landmark size={12} />
          BIN check
        </span>
        <span className="font-mono text-[11px] text-brand-400">{bin}</span>
      </div>

      {result.state === "loading" ? (
        <p className="mt-2 text-xs text-brand-400">Looking up the issuer…</p>
      ) : (
        <div className="mt-2 space-y-1">
          <Row label="Bank">
            {bank ?? <span className="font-normal text-brand-400">Not on record</span>}
          </Row>
          {line ? <Row label="Card">{line}</Row> : null}
          {info?.country ? (
            <Row label="Country">
              {info.countryEmoji ? `${info.countryEmoji} ` : ""}
              {info.country}
            </Row>
          ) : null}
          {!info ? (
            <p className="pt-0.5 text-[11px] leading-snug text-brand-400">
              {local
                ? "Live lookup unavailable — bank name is from the local issuer list."
                : "No issuer details available for this BIN."}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * The compact form, for a table cell: two short lines, no box. Same lookup and
 * the same cache as the panel, so a row costs nothing extra once seen.
 */
export function BinSummary({ cardNumber }: { cardNumber: string | null | undefined }) {
  const { bin, result } = useBinLookup(cardNumber);
  const local = lookupIssuer(cardNumber)?.name ?? null;

  if (!bin) return <span className="text-xs text-brand-300">—</span>;
  if (result.state === "loading") return <span className="text-xs text-brand-300">Checking…</span>;

  const info = result.state === "ok" ? result.info : null;
  const bank = info?.bank ?? local;
  const line = info ? describe(info) : null;

  if (!bank && !line) {
    return (
      <span className="font-mono text-xs text-brand-400" title={`BIN ${bin}`}>
        BIN {bin}
      </span>
    );
  }

  return (
    <div className="min-w-0 leading-tight">
      {bank ? <p className="truncate text-xs font-semibold text-brand-900">{bank}</p> : null}
      <p className="truncate text-[11px] text-brand-500">
        {line ?? <span className="font-mono">BIN {bin}</span>}
        {info?.country ? ` · ${info.countryEmoji ?? ""}${info.country}` : ""}
      </p>
    </div>
  );
}
