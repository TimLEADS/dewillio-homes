"use client";

import { useState } from "react";
import { Check, Copy, FileDown } from "lucide-react";

/**
 * Document actions for the agreement page.
 *
 * "Save as PDF" uses the browser's own print pipeline rather than a bundled PDF
 * library. For a legal document that is the better tool: the output is real
 * vector text with selectable, searchable characters (not a canvas screenshot),
 * it inherits the print stylesheet so only the agreement itself is paginated,
 * and it adds nothing to the client bundle.
 */
export function AgreementTools({ plainText }: { plainText: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked by permissions; silently ignore so the page
      // never shows "copied" when nothing was copied.
    }
  };

  return (
    <div className="print:hidden">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="btn-sheen inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-accent-400 via-accent-500 to-accent-600 px-6 py-3.5 text-sm font-bold text-brand-975 shadow-[0_16px_40px_-16px_rgba(201,164,74,0.85)] transition-all duration-500"
        >
          <FileDown size={16} />
          Save as PDF
        </button>
        <button
          type="button"
          onClick={copy}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-brand-200 bg-white px-6 py-3.5 text-sm font-semibold text-brand-900 transition-colors hover:border-brand-400 hover:bg-brand-50"
        >
          {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
          {copied ? "Copied" : "Copy full text"}
        </button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-brand-500">
        “Save as PDF” opens your browser&apos;s print dialog — choose{" "}
        <strong className="font-semibold text-brand-700">Save as PDF</strong> as the destination to
        keep a copy for your broker. Only the agreement is printed; navigation and promotions are
        left out.
      </p>
    </div>
  );
}