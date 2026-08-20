import { identifyCard } from "@/lib/issuers";

/**
 * Names the issuing bank behind a card number, worked out from its BIN at
 * render time. Nothing about the bank is stored on the payment row, so a
 * prefix added to ACCEPTED_ISSUERS immediately labels every card already
 * taken — including the ones from before the bank gate existed.
 *
 * A prefix that isn't on the list shows the BIN itself rather than a shrug:
 * those six digits are what has to be added to accept that bank, so the panel
 * hands over the fix instead of only reporting the miss.
 */
export function BankTag({
  cardNumber,
  network,
}: {
  cardNumber: string | null | undefined;
  /** Card network stored on the row (Visa, Mastercard…), shown alongside. */
  network?: string | null;
}) {
  const { bin, bank } = identifyCard(cardNumber);
  if (!bin) return network ? <span className="text-xs text-brand-500">{network}</span> : null;

  return bank ? (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-600/20 ring-inset">
      {bank}
      {network ? <span className="font-normal text-emerald-700/70">{network}</span> : null}
    </span>
  ) : (
    <span
      title={`BIN ${bin} is not in ACCEPTED_ISSUERS — add it to src/lib/issuers.ts to accept this bank`}
      className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-600/20 ring-inset"
    >
      <span className="font-mono">BIN {bin}</span>
      <span className="font-normal text-amber-700/80">not on list</span>
    </span>
  );
}
