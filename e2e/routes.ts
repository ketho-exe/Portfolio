import { projects } from "../src/content/projects";

/** Every exported page. Project pages come from content, so new case studies are covered automatically. */
export const routes = ["/", "/projects/", "/playground/", "/about/", "/contact/", ...projects.map((p) => `/projects/${p.slug}/`)];
