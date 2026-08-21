/**
 * The site's own public address, used for canonical URLs, the sitemap and
 * robots.txt.
 *
 * Search engines treat `https://dewiliohomes.us/x` and a preview deployment's
 * `https://dewillio-homes-abc123.vercel.app/x` as two different pages with the
 * same content, and pick one themselves. Every page therefore declares which
 * URL is the real one, and that has to be an absolute address — relative ones
 * are meaningless to a crawler that arrived from somewhere else.
 *
 * Set NEXT_PUBLIC_SITE_URL in the Vercel project if the domain ever changes;
 * the fallback keeps local builds and any forgotten environment pointing at the
 * live domain rather than at localhost.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://dewiliohomes.us").replace(
  /\/+$/,
  ""
);

export const SITE_NAME = "Dewilio Homes";

/** Absolute URL for a site-relative path, for canonicals and the sitemap. */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Pages a crawler should index, in rough order of importance. The sitemap and
 * robots.txt both read from here, so a new marketing page only has to be added
 * once. Anything behind a login is deliberately absent.
 */
export const PUBLIC_ROUTES: Array<{ path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }> = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/how-it-works", priority: 0.8, changeFrequency: "monthly" },
  { path: "/for-agents", priority: 0.8, changeFrequency: "monthly" },
  { path: "/lead-program", priority: 0.8, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.7, changeFrequency: "monthly" },
  { path: "/join", priority: 0.9, changeFrequency: "monthly" },
];

/** Everything a crawler must stay out of: private areas and the API. */
export const PRIVATE_PATHS = ["/admin", "/dashboard", "/api", "/activate", "/setup", "/onboarding"];
