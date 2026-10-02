export type Clause = {
  number: number;
  slug: string;
  title: string;
  body: string;
};

/** "PARTIES AND PURPOSE" -> "parties-and-purpose" */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Turns the single REFERRAL_AGREEMENT_BODY string in lib/db.ts into structured
 * clauses so the agreement page can render it properly — numbered headings, a
 * working table of contents and deep links — without the legal text being
 * duplicated into the page.
 *
 * Expected shape: clauses separated by a blank line, each starting with
 * "N. TITLE" followed by its paragraph(s).
 */
export function parseAgreement(raw: string): Clause[] {
  return raw
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [first, ...rest] = block.split("\n");
      const heading = first.trim();
      const match = heading.match(/^(\d+)\.\s*(.+)$/);

      if (!match) {
        // No numbered heading: keep the text so nothing is silently dropped.
        return {
          number: 0,
          slug: slugify(heading),
          title: "",
          body: [heading, ...rest].join(" ").replace(/\s+/g, " ").trim(),
        };
      }

      return {
        number: Number(match[1]),
        slug: slugify(match[2]),
        title: match[2].trim(),
        body: rest.join(" ").replace(/\s+/g, " ").trim(),
      };
    });
}