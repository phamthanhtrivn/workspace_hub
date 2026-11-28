import type { MetadataRoute } from "next";
import { getSiteConfig } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const { origin, indexable } = getSiteConfig();
  return {
    // Crawlers must be able to read the noindex tags on non-indexable pages.
    rules: { userAgent: "*", allow: "/" },
    ...(indexable && origin ? { sitemap: new URL("/sitemap.xml", origin).href } : {}),
  };
}
