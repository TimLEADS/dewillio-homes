import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * BIN lookup for the admin Payments page — turns the first digits of a stored
 * card into its issuing bank, scheme, type and country.
 *
 * The provider is binlist.net's free, key-less endpoint. It is rate-limited for
 * anonymous callers, so the lookup runs here rather than in the browser: one
 * shared cache serves every admin and every row, distinct BINs are few, and a
 * repeat within the day never leaves the server. A miss or a throttle degrades
 * to the local BankTag guess instead of an error.
 */
const PROVIDER = "https://lookup.binlist.net";

/** Normalised shape returned to the client, provider-independent. */
interface BinInfo {
  scheme: string | null;
  type: string | null;
  brand: string | null;
  prepaid: boolean | null;
  bank: string | null;
  country: string | null;
  countryEmoji: string | null;
}

type CacheEntry =
  | { kind: "hit"; info: BinInfo; at: number }
  | { kind: "miss"; at: number }
  | { kind: "error"; at: number };

const CACHE = new Map<string, CacheEntry>();
const HIT_TTL = 24 * 60 * 60 * 1000; // a bank keeps its BIN for years — a day is safe
const MISS_TTL = 6 * 60 * 60 * 1000;
const ERROR_TTL = 60 * 1000; // a throttle clears fast; don't cache it long

function fresh(entry: CacheEntry): boolean {
  const ttl = entry.kind === "hit" ? HIT_TTL : entry.kind === "miss" ? MISS_TTL : ERROR_TTL;
  return Date.now() - entry.at < ttl;
}

function normalize(raw: unknown): BinInfo {
  const r = (raw ?? {}) as Record<string, unknown>;
  const country = (r.country ?? {}) as Record<string, unknown>;
  const bank = (r.bank ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return {
    scheme: str(r.scheme),
    type: str(r.type),
    brand: str(r.brand),
    prepaid: typeof r.prepaid === "boolean" ? r.prepaid : null,
    bank: str(bank.name),
    country: str(country.name),
    countryEmoji: str(country.emoji),
  };
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role === "agent") {
    return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  }

  const bin = (new URL(request.url).searchParams.get("bin") ?? "").replace(/\D/g, "").slice(0, 8);
  if (bin.length < 6) {
    return NextResponse.json({ status: "invalid" }, { status: 400 });
  }

  const cached = CACHE.get(bin);
  if (cached && fresh(cached)) {
    if (cached.kind === "hit") return NextResponse.json({ status: "ok", info: cached.info });
    if (cached.kind === "miss") return NextResponse.json({ status: "not_found" });
    return NextResponse.json({ status: "unavailable" });
  }

  try {
    // A short timeout keeps a slow or down provider from hanging the request.
    const res = await fetch(`${PROVIDER}/${bin}`, {
      headers: { "Accept-Version": "3", Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });

    if (res.status === 404) {
      CACHE.set(bin, { kind: "miss", at: Date.now() });
      return NextResponse.json({ status: "not_found" });
    }
    if (!res.ok) {
      // 429 (throttled) and any 5xx land here — cache briefly, tell the client.
      CACHE.set(bin, { kind: "error", at: Date.now() });
      return NextResponse.json({ status: "unavailable" });
    }

    const info = normalize(await res.json());
    CACHE.set(bin, { kind: "hit", info, at: Date.now() });
    return NextResponse.json({ status: "ok", info });
  } catch {
    CACHE.set(bin, { kind: "error", at: Date.now() });
    return NextResponse.json({ status: "unavailable" });
  }
}
