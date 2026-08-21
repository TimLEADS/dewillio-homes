"use client";

import { useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";

/**
 * One-click copy of a whole card — number, expiry, CVC and cardholder — for the
 * admin Payments page.
 *
 * The number goes out as bare digits rather than in the grouped form shown on
 * screen, because the usual destination is another card field that rejects
 * spaces. Everything else is labelled so a pasted block stays readable.
 *
 * `navigator.clipboard` needs a secure context; the admin panel is served over
 * HTTPS in production but not always in local development, so a hidden textarea
 * and `execCommand` stand in when it is missing. A copy that fails says so
 * rather than silently reporting success.
 */

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission refused or no secure context — try the legacy path below.
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    // Off-screen but still focusable: a display:none element cannot be selected.
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/** Digits only — what a card field on the far end will actually accept. */
function digitsOnly(value: string | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "");
}

export interface CardFields {
  number: string | null | undefined;
  /** Already formatted as MM/YY, or null when the row has no expiry. */
  expiry?: string | null;
  cvc?: string | null;
  name?: string | null;
}

/** The block that lands on the clipboard, missing fields left out entirely. */
export function cardText({ number, expiry, cvc, name }: CardFields): string {
  const digits = digitsOnly(number);
  const lines = [
    digits ? `Card: ${digits}` : null,
    expiry ? `Exp:  ${expiry}` : null,
    cvc ? `CVC:  ${cvc}` : null,
    name ? `Name: ${name}` : null,
  ].filter(Boolean) as string[];
  return lines.join("\n");
}

/** How long the button stays in its copied/failed state before resetting. */
const FLASH_MS = 1600;

/**
 * `variant="button"` is the labelled form for a card panel; `variant="icon"` is
 * the compact one for a table cell, where the label would crowd the number.
 */
export function CopyCard({
  variant = "button",
  className = "",
  ...fields
}: CardFields & { variant?: "button" | "icon"; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const text = cardText(fields);

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), FLASH_MS);
    return () => clearTimeout(timer);
  }, [state]);

  // Nothing on the row to copy — an enabled button here would be a dead end.
  if (!text) return null;

  const copy = async () => {
    setState((await writeClipboard(text)) ? "copied" : "failed");
  };

  const label = state === "copied" ? "Copied" : state === "failed" ? "Press Ctrl+C" : "Copy card";
  const icon =
    state === "copied" ? <Check size={13} /> : state === "failed" ? <X size={13} /> : <Copy size={13} />;

  const tone =
    state === "copied"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : state === "failed"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-brand-200 text-brand-600 hover:bg-brand-50 hover:text-brand-900";

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={copy}
        title={`Copy card details\n${text}`}
        aria-label={state === "copied" ? "Card details copied" : "Copy card details"}
        className={`inline-flex items-center gap-1 rounded-lg border px-1.5 py-1 align-middle text-[11px] font-semibold transition-colors ${tone} ${className}`}
      >
        {icon}
        {state === "copied" ? "Copied" : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={state === "copied" ? "Card details copied" : "Copy card details"}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${tone} ${className}`}
    >
      {icon}
      {label}
    </button>
  );
}
