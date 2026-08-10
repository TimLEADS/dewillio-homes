/**
 * Card presentation rules shared by the checkout form and the server action,
 * so the brand a user watches appear as they type is the same one written to
 * activation_payments. No validation here is a substitute for a real gateway —
 * it only catches typos before a submit.
 */
export type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "unknown";

export interface BrandSpec {
  /** Shown in the UI and stored on the payment row. */
  label: string;
  /** Digit counts a complete number may have. */
  lengths: number[];
  /** Digits in the security code. */
  cvcLength: number;
  /** Digit offsets to insert a space before, e.g. 4-4-4-4 or Amex 4-6-5. */
  gaps: number[];
  cvcLabel: string;
}

const SPECS: Record<CardBrand, BrandSpec> = {
  visa: { label: "Visa", lengths: [16, 19], cvcLength: 3, gaps: [4, 8, 12, 16], cvcLabel: "CVV" },
  mastercard: { label: "Mastercard", lengths: [16], cvcLength: 3, gaps: [4, 8, 12], cvcLabel: "CVC" },
  amex: { label: "American Express", lengths: [15], cvcLength: 4, gaps: [4, 10], cvcLabel: "CID" },
  discover: { label: "Discover", lengths: [16, 19], cvcLength: 3, gaps: [4, 8, 12, 16], cvcLabel: "CID" },
  unknown: { label: "Card", lengths: [16, 19], cvcLength: 3, gaps: [4, 8, 12, 16], cvcLabel: "CVC" },
};

export function brandSpec(brand: CardBrand): BrandSpec {
  return SPECS[brand];
}

export function digitsOf(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Issuer identification by leading digits. Mastercard's 2221-2720 range is as
 * current as 51-55, and Discover covers 6011, 65 and 644-649.
 */
export function detectBrand(value: string): CardBrand {
  const d = digitsOf(value);
  if (/^4/.test(d)) return "visa";
  if (/^5[1-5]/.test(d)) return "mastercard";
  if (/^2/.test(d)) {
    const head = Number(d.slice(0, 4).padEnd(4, "0"));
    if (head >= 2221 && head <= 2720) return "mastercard";
  }
  if (/^3[47]/.test(d)) return "amex";
  if (/^6(?:011|5|4[4-9])/.test(d)) return "discover";
  return "unknown";
}

/** Display label for a raw number, matching what the form showed. */
export function brandLabel(value: string): string {
  return SPECS[detectBrand(value)].label;
}

/** Groups digits the way the issuer prints them on the card. */
export function formatCardNumber(value: string): string {
  const spec = SPECS[detectBrand(value)];
  const max = Math.max(...spec.lengths);
  const d = digitsOf(value).slice(0, max);
  let out = "";
  for (let i = 0; i < d.length; i++) {
    if (spec.gaps.includes(i) && i !== 0) out += " ";
    out += d[i];
  }
  return out;
}

/** Types as MM/YY, inserting the slash and correcting an impossible month. */
export function formatExpiry(value: string): string {
  let d = digitsOf(value).slice(0, 4);
  // A lone "5" can only mean May, so complete it rather than waiting for "05".
  if (d.length === 1 && Number(d) > 1) d = `0${d}`;
  if (d.length >= 2) {
    const month = Math.min(Math.max(Number(d.slice(0, 2)), 1), 12);
    d = String(month).padStart(2, "0") + d.slice(2);
  }
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`;
}

/** The checksum every issuer's numbers satisfy; catches transposed digits. */
export function luhn(value: string): boolean {
  const d = digitsOf(value);
  if (d.length < 12) return false;
  let sum = 0;
  let double = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = d.charCodeAt(i) - 48;
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

export function isCardNumberComplete(value: string): boolean {
  const d = digitsOf(value);
  return SPECS[detectBrand(value)].lengths.includes(d.length) && luhn(d);
}

/** Rejects a past month, and anything absurdly far out. */
export function isExpiryValid(value: string, now = new Date()): boolean {
  const m = value.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  if (year > now.getFullYear() + 25) return false;
  const endOfMonth = new Date(year, month, 1).getTime();
  return endOfMonth > now.getTime();
}
