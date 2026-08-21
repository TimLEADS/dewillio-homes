import type { MetadataRoute } from "next";
import { absoluteUrl, PUBLIC_ROUTES } from "@/lib/site";

/**
 * Served at /sitemap.xml, and pointed at from robots.txt. This is what gets
 * submitted in Google Search Console: it tells the crawler every public page
 * exists without it having to discover each one by following links.
 *
 * `lastModified` is the build time, so a redeploy tells crawlers the content
 * may have changed.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
  }));
}
