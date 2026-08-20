/**
 * The banks whose cards this checkout accepts, and the issuer prefixes (BINs)
 * their cards are printed with. The $1 activation charge only clears cleanly
 * for these issuers, so a card outside the list is turned away on the payment
 * step rather than failing after the money moves.
 *
 * `bins` is the only thing to edit when a bank is added or reissues a range —
 * the live field check and the server action both read from this one table.
 * The first six digits of any card number are its BIN, so a card that should
 * be accepted but isn't only needs its prefix added here.
 */
import { digitsOf, type CardBrand } from "@/lib/cards";

export interface Issuer {
  /** Bank name, as shown to the applicant. */
  name: string;
  /** Network its cards run on, for the mark drawn beside the name. */
  brand: CardBrand;
  /** Leading digits of that bank's card numbers. */
  bins: string[];
}

/**
 * SEED RANGES — verify each against a real card before going live. A prefix
 * that is wrong in this table blocks a customer who should have been let
 * through, and no amount of retrying on their end will fix it.
 */
export const ACCEPTED_ISSUERS: Issuer[] = [
  { name: "Ally Bank", brand: "mastercard", bins: ["542418", "546616", "512107"] },
  { name: "Wallbit", brand: "visa", bins: ["489537", "428839"] },
  { name: "Chime", brand: "visa", bins: ["424631", "400114", "453210"] },
  { name: "SoFi", brand: "mastercard", bins: ["541155", "517722"] },
  { name: "Payoneer", brand: "mastercard", bins: ["552433", "512829", "551149"] },
  { name: "Mercury", brand: "mastercard", bins: ["556368", "529931"] },
  { name: "Zenus Bank", brand: "visa", bins: ["432155", "492181"] },
  { name: "Revolut", brand: "visa", bins: ["537819", "462974", "516417"] },
  { name: "Wise", brand: "mastercard", bins: ["517805", "455280", "426430"] },
  { name: "Relay", brand: "visa", bins: ["440393", "471543"] },
];

export type IssuerMatch =
  /** The typed digits sit inside an accepted bank's range. */
  | { status: "accepted"; issuer: Issuer }
  /** Too few digits to tell yet — every message stays quiet. */
  | { status: "incomplete" }
  /** The digits already rule out every accepted bank. */
  | { status: "rejected" };

/**
 * Decided on the shortest number of digits that can decide it. As soon as the
 * typed prefix is incompatible with every accepted range the answer is final,
 * so a Chase or Amex card is named as unsupported at the fourth or fifth digit
 * instead of after a full 16 and a submit.
 */
export function matchIssuer(value: string): IssuerMatch {
  const d = digitsOf(value);
  if (!d) return { status: "incomplete" };

  let best: { issuer: Issuer; bin: string } | null = null;
  let partial = false;

  for (const issuer of ACCEPTED_ISSUERS) {
    for (const bin of issuer.bins) {
      // A longer prefix wins, so an overlapping range stays unambiguous.
      if (d.startsWith(bin)) {
        if (!best || bin.length > best.bin.length) best = { issuer, bin };
      } else if (bin.startsWith(d)) {
        partial = true;
      }
    }
  }

  if (best) return { status: "accepted", issuer: best.issuer };
  return partial ? { status: "incomplete" } : { status: "rejected" };
}

/** True only once the number is known to belong to a bank on the list. */
export function isAcceptedIssuer(value: string): boolean {
  return matchIssuer(value).status === "accepted";
}

/** For the rejection message and the server-side error, in list order. */
export function acceptedBankNames(): string[] {
  return ACCEPTED_ISSUERS.map((i) => i.name);
}
