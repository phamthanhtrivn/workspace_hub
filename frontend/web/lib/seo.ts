import "server-only";

import type { Metadata } from "next";
import { PAGE_METADATA, SITE_NAME, type MetadataPage } from "./page-metadata";

export const PRIVATE_ROBOTS: Metadata["robots"] = { index: false, follow: false };
export const SOCIAL_IMAGE = {
  path: "/social-image",
  width: 1200,
  height: 630,
  alt: "WorkspaceHub — projects, tasks and team collaboration in one connected workspace",
} as const;

/** Explicit opt-in only; never derive a public origin from an API or request host. */
export function getSiteConfig() {
  const indexSetting = process.env.SITE_INDEXABLE?.trim() || "false";
  if (indexSetting !== "true" && indexSetting !== "false") {
    throw new Error("SITE_INDEXABLE must be true or false.");
  }

  const configuredUrl = process.env.SITE_URL?.trim();
  let origin: URL | undefined;
  if (configuredUrl) {
    try {
      origin = new URL(configuredUrl);
    } catch {
      throw new Error("SITE_URL must be a valid HTTPS origin.");
    }
    const host = origin.hostname.toLowerCase();
    const localHost = host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
      host.includes(":") || /^\d+(?:\.\d+){3}$/.test(host) || !host.includes(".");
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" ||
        origin.search || origin.hash || origin.port || localHost) {
      throw new Error("SITE_URL must be a public HTTPS origin without credentials, a port, path, query or fragment.");
    }
  }

  const indexable = indexSetting === "true";
  if (indexable && (!origin || process.env.NODE_ENV !== "production")) {
    throw new Error("Indexing requires SITE_URL and NODE_ENV=production. Keep SITE_INDEXABLE=false until a production domain is configured.");
  }
  return { origin, indexable };
}

export function createPageMetadata(page: MetadataPage): Metadata {
  const { title, description } = PAGE_METADATA[page];
  return { title, description, robots: PRIVATE_ROBOTS };
}

export function createHomeMetadata(): Metadata {
  const { origin, indexable } = getSiteConfig();
  const { title, description } = PAGE_METADATA["/"];
  const image = origin ? { url: new URL(SOCIAL_IMAGE.path, origin).href, width: SOCIAL_IMAGE.width,
    height: SOCIAL_IMAGE.height, alt: SOCIAL_IMAGE.alt } : undefined;
  return {
    title: { absolute: title },
    description,
    robots: indexable ? { index: true, follow: true } : PRIVATE_ROBOTS,
    ...(origin ? { alternates: { canonical: origin.href } } : {}),
    openGraph: {
      type: "website", siteName: SITE_NAME, locale: "en_US", title, description,
      ...(origin ? { url: origin.href } : {}),
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary", title, description,
      ...(image ? { images: [{ url: image.url, alt: image.alt }] } : {}),
    },
  };
}

export function createRootMetadata(): Metadata {
  const { origin } = getSiteConfig();
  return {
    ...(origin ? { metadataBase: origin } : {}),
    applicationName: SITE_NAME,
    title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
    description: PAGE_METADATA["/"].description,
    robots: PRIVATE_ROBOTS,
  };
}
