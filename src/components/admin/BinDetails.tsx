"use client";

import { useEffect, useState, type ReactNode } from "react";
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

type Result =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ok"; info: BinInfo }
  /** Not in the database, or the provider was unreachable — same UI either way. */
  | { state: "none" };

const CACHE = new Map<string, Result>();
const INFLIGHT = new Map<string, Promise<Result>>();

async function lookup(bin: string): Promise<Result> {
  const cached = CACHE.get(bin);
  if (cached) return cached;
  const running = INFLIGHT.get(bin);
  if (running) return running;

  const request = (async (): Promise<Result> => {
    try {
      const res = await fetch(`/api/admin/bin?bin=${bin}`, { cache: "no-store" });
      const data = (await res.json()) as { status?: string; info?: BinInfo };
      if (data.status === "ok" && data.info) {
        const hit: Result = { state: "ok", info: data.info };
        CACHE.set(bin, hit);
        return hit;
      }
      // A definite "no such BIN" is worth remembering; a throttled or down
      // provider is not — that one should be asked again on the next render.
      if (data.status === "not_found") CACHE.set(bin, { state: "none" });
      return { state: "none" };
    } catch {
      return { state: "none" };
    } finally {
      INFLIGHT.delete(bin);
    }
  })();

  INFLIGHT.set(bin, request);
  return request;
}

/** First six digits of whatever has been typed or stored, or null if too short. */
function binOf(cardNumber: string | null | undefined): string | null {
  const digits = String(cardNumber ?? "").replace(/\D/g, "");
  return digits.length >= 6 ? digits.slice(0, 6) : null;
}

function useBinLookup(cardNumber: string | null | undefined) {
  const bin = binOf(cardNumber);
  const [result, setResult] = useState<Result>({ state: "idle" });

  useEffect(() => {
    if (!bin) {
      setResult({ state: "idle" });
      return;
    }
    const cached = CACHE.get(bin);
    if (cached) {
      setResult(cached);
      return;
    }
    let stale = false;
    setResult({ state: "loading" });
    void lookup(bin).then((r) => {
      if (!stale) setResult(r);
    });
    return () => {
      // The live panel re-renders as digits arrive; a late answer for a BIN
      // that has already been typed past must not overwrite the current one.
      stale = true;
    };
  }, [bin]);

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
  // "idle" is the server-rendered first paint, before the effect has fired.
  // It reads as pending, not as a failed lookup.
  const pending = result.state === "idle" || result.state === "loading";

  return (
    <div className={`rounded-xl border border-brand-100 bg-white p-3 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-400">
          <Landmark size={12} />
          BIN check
        </span>
        <span className="font-mono text-[11px] text-brand-400">{bin}</span>
      </div>

      {pending ? (
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
  if (result.state === "idle" || result.state === "loading") {
    return <span className="text-xs text-brand-300">Checking…</span>;
  }

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
