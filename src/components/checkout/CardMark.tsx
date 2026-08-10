import type { CardBrand } from "@/lib/cards";

/**
 * Issuer marks drawn inline rather than fetched, so the checkout never waits on
 * a third-party image and keeps working offline. Simplified on purpose: these
 * read at 32px, which is the only size they are used at.
 */
export function CardMark({ brand, dim = false }: { brand: CardBrand; dim?: boolean }) {
  const shell = `h-[22px] w-8 shrink-0 rounded-[4px] transition-all duration-200 ${
    dim ? "opacity-25 grayscale" : "opacity-100 shadow-sm"
  }`;

  if (brand === "visa") {
    return (
      <svg viewBox="0 0 32 22" className={shell} aria-label="Visa" role="img">
        <rect width="32" height="22" rx="4" fill="#1A1F71" />
        <text
          x="16"
          y="15.5"
          textAnchor="middle"
          fill="#fff"
          fontSize="9.5"
          fontWeight="700"
          fontStyle="italic"
          fontFamily="Georgia, serif"
          letterSpacing="0.5"
        >
          VISA
        </text>
      </svg>
    );
  }

  if (brand === "mastercard") {
    return (
      <svg viewBox="0 0 32 22" className={shell} aria-label="Mastercard" role="img">
        <rect width="32" height="22" rx="4" fill="#16120E" />
        <circle cx="13" cy="11" r="6.5" fill="#EB001B" />
        <circle cx="19" cy="11" r="6.5" fill="#F79E1B" />
        <path
          d="M16 6.05a6.49 6.49 0 0 0 0 9.9 6.49 6.49 0 0 0 0-9.9Z"
          fill="#FF5F00"
        />
      </svg>
    );
  }

  if (brand === "amex") {
    return (
      <svg viewBox="0 0 32 22" className={shell} aria-label="American Express" role="img">
        <rect width="32" height="22" rx="4" fill="#1F72CD" />
        <text
          x="16"
          y="14.5"
          textAnchor="middle"
          fill="#fff"
          fontSize="7"
          fontWeight="700"
          fontFamily="Arial, sans-serif"
          letterSpacing="0.2"
        >
          AMEX
        </text>
      </svg>
    );
  }

  if (brand === "discover") {
    return (
      <svg viewBox="0 0 32 22" className={shell} aria-label="Discover" role="img">
        <rect width="32" height="22" rx="4" fill="#fff" stroke="#E2E8F0" />
        <path d="M14 22h14a4 4 0 0 0 4-4v-3.2C27 18 20 20.6 14 22Z" fill="#F76B1C" />
        <text
          x="15"
          y="11"
          textAnchor="middle"
          fill="#1A1F36"
          fontSize="5.2"
          fontWeight="700"
          fontFamily="Arial, sans-serif"
        >
          DISCOVER
        </text>
      </svg>
    );
  }

  // Generic card, shown before enough digits exist to identify an issuer.
  return (
    <svg viewBox="0 0 32 22" className={shell} aria-label="Card" role="img">
      <rect width="32" height="22" rx="4" fill="#E7ECF3" />
      <rect y="6" width="32" height="3.5" fill="#C3CEDC" />
      <rect x="4" y="14" width="9" height="2.5" rx="1.25" fill="#C3CEDC" />
    </svg>
  );
}
