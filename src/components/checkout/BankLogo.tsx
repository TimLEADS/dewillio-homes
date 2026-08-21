/**
 * Per-bank app-icon tiles, drawn inline so the checkout never waits on a
 * third-party image and keeps working offline (the checkout CSP blocks remote
 * images regardless). These are brand-coloured monogram marks in each bank's
 * own palette — recognisable, not the companies' official logo files, which we
 * neither bundle nor hotlink. Keyed by the exact `name` in ACCEPTED_ISSUERS.
 */
interface Mark {
  /** Tile background. A two-stop pair renders a diagonal gradient. */
  bg: string | [string, string];
  /** Monogram colour. */
  fg: string;
  /** One or two letters shown on the tile. */
  text: string;
  /** Hairline ring, for light tiles that would otherwise vanish on white. */
  ring?: string;
}

const MARKS: Record<string, Mark> = {
  "Ally Bank": { bg: "#650360", fg: "#ffffff", text: "A" },
  Wallbit: { bg: ["#0f172a", "#1e293b"], fg: "#34d399", text: "W" },
  Chime: { bg: "#1ec677", fg: "#ffffff", text: "C" },
  SoFi: { bg: ["#1d4ed8", "#3b82f6"], fg: "#ffffff", text: "S" },
  Payoneer: { bg: "#ff4b00", fg: "#ffffff", text: "P" },
  Mercury: { bg: ["#5b5bf5", "#8b7cf6"], fg: "#ffffff", text: "M" },
  "Zenus Bank": { bg: "#0a2540", fg: "#e2c584", text: "Z" },
  Revolut: { bg: ["#101012", "#26262b"], fg: "#ffffff", text: "R" },
  Wise: { bg: "#9fe870", fg: "#163300", text: "Wi", ring: "#8bd85e" },
  Relay: { bg: "#14385a", fg: "#7cd4c0", text: "Re" },
};

/** Neutral fallback for a bank added without a mark of its own yet. */
const FALLBACK: Mark = { bg: "#e6edf6", fg: "#17294b", text: "•", ring: "#c8d9ec" };

export function BankLogo({ name, className = "h-7 w-7" }: { name: string; className?: string }) {
  const mark = MARKS[name] ?? { ...FALLBACK, text: name.slice(0, 1).toUpperCase() };
  const id = `bank-${name.replace(/[^a-z0-9]/gi, "")}`;
  const gradient = Array.isArray(mark.bg);
  // A two-letter monogram needs a smaller glyph to sit inside the same tile.
  const fontSize = mark.text.length > 1 ? 15 : 20;

  return (
    <svg viewBox="0 0 40 40" className={`${className} shrink-0`} role="img" aria-label={name}>
      {gradient ? (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor={(mark.bg as [string, string])[0]} />
            <stop offset="1" stopColor={(mark.bg as [string, string])[1]} />
          </linearGradient>
        </defs>
      ) : null}
      <rect
        width="40"
        height="40"
        rx="10"
        fill={gradient ? `url(#${id})` : (mark.bg as string)}
        stroke={mark.ring}
        strokeWidth={mark.ring ? 1 : 0}
      />
      <text
        x="20"
        y="21"
        textAnchor="middle"
        dominantBaseline="central"
        fill={mark.fg}
        fontSize={fontSize}
        fontWeight="700"
        fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        letterSpacing={mark.text.length > 1 ? "-0.5" : "0"}
      >
        {mark.text}
      </text>
    </svg>
  );
}
