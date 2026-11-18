/**
 * Site identity and contact details.
 * `null` means "not supplied yet": the UI renders a visible <Placeholder> instead.
 * Never fill these with invented values — see AGENTS.md.
 */
export type SiteConfig = {
  name: string;
  nameIsPlaceholder: boolean;
  role: string;
  tagline: string;
  description: string;
  email: string | null;
  linkedin: string | null;
  github: string | null;
  cvUrl: string | null;
};

export const site: SiteConfig = {
  name: "Your Name",
  nameIsPlaceholder: true,
  role: "Developer",
  tagline: "Web development · Software solutions · Business automation · Integrations",
  description:
    "Portfolio of a developer who designs, builds, integrates and automates software for practical business problems.",
  email: null,
  linkedin: null,
  github: null,
  cvUrl: null,
};

export const nav = [
  { href: "/projects/", label: "Work" },
  { href: "/about/", label: "About" },
  { href: "/contact/", label: "Contact" },
] as const;
