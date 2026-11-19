import type { Metadata } from "next";
import { site } from "@/content/site";

/**
 * Open Graph fields every page shares. A page's `openGraph` replaces the layout's (Next merges metadata
 * shallowly), so `pageMetadata` spreads these back in. og:title/description fall back to the page's own.
 */
export const baseOpenGraph = { type: "website", siteName: site.name, locale: "en_GB" } as const;

/** app/opengraph-image.png. The file convention only fills it in where no page sets `openGraph`. */
const shareImage = { url: "/opengraph-image.png", type: "image/png", width: 1200, height: 630, alt: `${site.name}, ${site.role}` };

/**
 * Page metadata with a self-referencing canonical URL and og:url, resolved against `metadataBase`.
 * `path` ends with "/" to match `trailingSlash: true`.
 */
export function pageMetadata(path: `/${string}`, meta: Pick<Metadata, "title" | "description"> = {}): Metadata {
  return { ...meta, alternates: { canonical: path }, openGraph: { ...baseOpenGraph, url: path, images: [shareImage] } };
}
