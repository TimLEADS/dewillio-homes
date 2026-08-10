"use client";

import { useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { CardMark } from "@/components/checkout/CardMark";
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

export function CardFields({ cardholderDefault }: { cardholderDefault: string }) {
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const brand = useMemo(() => detectBrand(number), [number]);
  const spec = brandSpec(brand);

  const numberBad = touched.number && number.length > 0 && !isCardNumberComplete(number);
  const expiryBad = touched.expiry && expiry.length > 0 && !isExpiryValid(expiry);
  const cvcBad = touched.cvc && cvc.length > 0 && cvc.length !== spec.cvcLength;

  const blur = (key: string) => setTouched((t) => ({ ...t, [key]: true }));

  const edge = (bad: boolean) => (bad ? "border-red-400" : "border-brand-200");

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="cardName" className="mb-1.5 block text-sm font-medium text-brand-900">
          Cardholder name
        </label>
        <input
          id="cardName"
          name="cardName"
          defaultValue={cardholderDefault}
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
              onChange={(e) => setNumber(formatCardNumber(e.target.value))}
              onBlur={() => blur("number")}
              required
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 1234 1234 1234"
              aria-invalid={numberBad || undefined}
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
              name="expiry"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
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

        {numberBad || expiryBad || cvcBad ? (
          <p className="mt-1.5 text-xs font-medium text-red-600">
            {numberBad
              ? "That card number doesn't look right — check the digits."
              : expiryBad
                ? "Enter a valid expiry date that hasn't passed."
                : `${spec.cvcLabel} must be ${spec.cvcLength} digits for ${spec.label}.`}
          </p>
        ) : brand !== "unknown" ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-brand-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            {spec.label} detected
          </p>
        ) : null}
      </div>

    </div>
  );
}
