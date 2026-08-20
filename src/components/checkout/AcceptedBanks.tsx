import { CardMark } from "@/components/checkout/CardMark";
import { ACCEPTED_ISSUERS } from "@/lib/issuers";
import { Landmark } from "lucide-react";

/**
 * The banks named above the card field, so the applicant reaches for the right
 * card before typing one. Nothing here is enforced — the form takes any card —
 * so the wording asks rather than warns.
 */
export function AcceptedBanks() {
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
            Please pay with a card issued by one of them.
          </p>
        </div>
      </div>

      <ul className="mt-3.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {ACCEPTED_ISSUERS.map((issuer) => (
          <li
            key={issuer.name}
            className="flex items-center gap-2 rounded-lg border border-brand-100 bg-brand-50/60 px-2.5 py-2"
          >
            <CardMark brand={issuer.brand} dim />
            <span className="truncate text-xs font-semibold text-brand-700">{issuer.name}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
