import type { ReactNode } from "react";
import { Home } from "lucide-react";

/**
 * The dark, secure-feeling backdrop shared by the three activation screens
 * (pending, OTP, approved) so the whole gate reads as one continuous moment:
 * a blueprint grid, two drifting glows, and a centred glass panel.
 */
export function ActivationShell({ children }: { children: ReactNode }) {
  return (
    <main className="hero-surface relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-12">
      <div className="bg-grid absolute inset-0" />
      <div className="animate-drift pointer-events-none absolute -left-24 top-4 h-[26rem] w-[26rem] rounded-full bg-accent-500/20 blur-[130px]" />
      <div className="animate-drift-slow pointer-events-none absolute -right-24 bottom-4 h-[26rem] w-[26rem] rounded-full bg-brand-400/25 blur-[130px]" />

      <div className="relative flex items-center gap-2.5 pb-8">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-accent-400 ring-1 ring-white/15">
          <Home size={17} />
        </span>
        <span className="font-serif text-lg font-bold text-white">
          Dewilio<span className="text-accent-400"> Homes</span>
        </span>
      </div>

      <div className="glass relative w-full max-w-md rounded-3xl p-8 shadow-2xl sm:p-10">{children}</div>

      <p className="relative mt-8 flex items-center gap-2 text-xs text-white/45">
        <span className="h-1 w-1 rounded-full bg-white/40" />
        Secured activation · Dewilio Homes
      </p>
    </main>
  );
}
