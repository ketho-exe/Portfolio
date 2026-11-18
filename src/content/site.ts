/**
 * Site identity and contact details, as supplied by the owner (vault: 01 Strategy/Owner Profile.md).
 * `null` means "not supplied yet": the UI renders a visible <Placeholder> instead.
 * Never fill these with invented values — see AGENTS.md.
 */
export type SiteConfig = {
  name: string;
  firstName: string;
  role: string;
  tagline: string;
  description: string;
  email: string | null;
  linkedin: string | null;
  github: string | null;
  cvUrl: string | null;
  /** Production origin, e.g. "https://example.com". Unknown until hosting is chosen; sitemap and absolute share URLs wait for it. */
  url: string | null;
};

export const site: SiteConfig = {
  name: "Szymon Klejny",
  firstName: "Szymon",
  role: "Software Developer & Automation Specialist",
  tagline: "Web development · Software solutions · Business automation · Integrations",
  description:
    "Szymon Klejny is a software developer building business applications, workflow automation and integrations with Next.js, TypeScript, Supabase, Zapier and Glide.",
  email: "sklejny@gmail.com",
  // Behind LinkedIn's sign-in wall, so it can't be checked automatically. URL as supplied by the owner.
  linkedin: "https://www.linkedin.com/in/szymon-klejny-732a58296/",
  github: "https://github.com/ketho-exe",
  cvUrl: "/cv/szymon-klejny-cv.pdf",
  url: null,
};

export const nav = [
  { href: "/projects/", label: "Work" },
  { href: "/playground/", label: "Playground" },
  { href: "/about/", label: "About" },
  { href: "/contact/", label: "Contact" },
] as const;
