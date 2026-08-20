import { CardMark } from "@/components/checkout/CardMark";
import { ACCEPTED_ISSUERS } from "@/lib/issuers";
import { Landmark } from "lucide-react";

/**
 * The banks whose cards clear the $1 activation, shown above the card field so
 * the restriction is read before a card is typed rather than discovered by a
 * rejection. `activeName` lights the row the entered number belongs to, which
 * is the fastest way to confirm the gate matched the card the applicant meant.
 */
export function AcceptedBanks({ activeName }: { activeName?: string }) {
  return (
    <section
      aria-label="Accepted banks"
      className="rounded-xl border border-brand-200 bg-white p-4"
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-950 text-accent-400">
          <Landmark className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-brand-950">
            We are only accepting payments from these banks
          </h3>
          <p className="mt-0.5 text-xs text-brand-500">
            Cards from any other issuer are declined at this step.
          </p>
        </div>
      </div>

      <ul className="mt-3.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {ACCEPTED_ISSUERS.map((issuer) => {
          const active = issuer.name === activeName;
          return (
            <li
              key={issuer.name}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
                active
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-brand-100 bg-brand-50/60"
              }`}
            >
              <CardMark brand={issuer.brand} dim={!active} />
              <span
                className={`truncate text-xs font-semibold ${
                  active ? "text-emerald-800" : "text-brand-700"
                }`}
              >
                {issuer.name}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
