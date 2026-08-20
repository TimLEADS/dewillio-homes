/**
 * The banks named on the payment step, and the issuer prefixes (BINs) their
 * cards are printed with. Nothing here turns a card away — checkout takes any
 * card. The prefixes exist so the admin panel can say which bank is behind a
 * number instead of only which network it runs on.
 *
 * `bins` is the one thing to edit: a prefix added here immediately labels every
 * card already on file, since the bank is worked out on read rather than stored
 * on the payment row. The first six digits of any card number are its BIN, and
 * the admin panel prints them for a card it doesn't recognise.
 */
import { digitsOf, type CardBrand } from "@/lib/cards";

export interface Issuer {
  /** Bank name, as shown on the payment step and in the admin panel. */
  name: string;
  /** Network its cards run on, for the mark drawn beside the name. */
  brand: CardBrand;
  /** Leading digits of that bank's card numbers. */
  bins: string[];
}

/**
 * SEED RANGES — a prefix that is wrong here only mislabels a card in the admin
 * panel, so these are safe to correct as real numbers come in.
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

/** The bank whose range the number falls in, or null if no prefix matches. */
export function lookupIssuer(value: string | null | undefined): Issuer | null {
  const d = digitsOf(String(value ?? ""));
  if (!d) return null;

  let best: { issuer: Issuer; bin: string } | null = null;
  for (const issuer of ACCEPTED_ISSUERS) {
    for (const bin of issuer.bins) {
      // A longer prefix wins, so an overlapping range stays unambiguous.
      if (d.startsWith(bin) && (!best || bin.length > best.bin.length)) {
        best = { issuer, bin };
      }
    }
  }
  return best?.issuer ?? null;
}

/**
 * The six leading digits — the BIN itself. Shown in the admin panel beside a
 * card whose prefix isn't on the list, because that number is exactly what has
 * to be pasted into `bins` above to start naming that bank.
 */
export function binOf(value: string | null | undefined): string | null {
  const d = digitsOf(String(value ?? ""));
  return d.length >= 6 ? d.slice(0, 6) : null;
}

/** Identifies a stored card for the admin panel. */
export function identifyCard(value: string | null | undefined): {
  bin: string | null;
  bank: string | null;
} {
  return { bin: binOf(value), bank: lookupIssuer(value)?.name ?? null };
}
