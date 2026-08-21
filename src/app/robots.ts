import type { MetadataRoute } from "next";
import { absoluteUrl, PRIVATE_PATHS } from "@/lib/site";

/**
 * Served at /robots.txt. Without one, a crawler has no pointer to the sitemap
 * and no instruction to stay out of the admin panel, the agent dashboard or the
 * API — so it spends its crawl budget on login redirects instead of the pages
 * that should rank.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: PRIVATE_PATHS,
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
