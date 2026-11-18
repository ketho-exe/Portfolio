import type { MetadataRoute } from "next";
import { projects } from "@/content/projects";
import { site } from "@/content/site";

export const dynamic = "force-static";

/** Sitemap URLs must be absolute, so this stays empty until `site.url` is set. */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!site.url) return [];
  const paths = ["/", "/projects/", "/playground/", "/about/", "/contact/", ...projects.map((p) => `/projects/${p.slug}/`)];
  return paths.map((path) => ({ url: `${site.url}${path}` }));
}
