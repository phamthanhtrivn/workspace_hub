import type { MetadataRoute } from "next";
import { getSiteConfig } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const { origin, indexable } = getSiteConfig();
  return indexable && origin ? [{ url: origin.href }] : [];
}
