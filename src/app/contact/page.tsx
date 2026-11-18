import type { Metadata } from "next";
import { Container, Eyebrow, Placeholder } from "@/components/ui";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact ${site.name}: email, LinkedIn, GitHub and CV.`,
};

/** "https://github.com/ketho-exe" → "github.com/ketho-exe" */
function displayUrl(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

export default function ContactPage() {
  const channels = [
    { label: "Email", value: site.email, href: site.email && `mailto:${site.email}`, external: false },
    { label: "LinkedIn", value: site.linkedin && displayUrl(site.linkedin), href: site.linkedin, external: true },
    { label: "GitHub", value: site.github && displayUrl(site.github), href: site.github, external: true },
    { label: "CV", value: site.cvUrl && "Download PDF", href: site.cvUrl, external: false },
  ];

  return (
    <Container className="pt-16 sm:pt-24">
      <Eyebrow>Contact</Eyebrow>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        Let&apos;s talk.
      </h1>
      <p className="mt-4 max-w-xl text-muted text-pretty">
        I&apos;m looking for junior software, application and automation developer roles. Email is the quickest way to
        reach me.
      </p>

      <ul className="mt-12 max-w-2xl divide-y divide-border border-y border-border">
        {channels.map((c) => (
          <li key={c.label} className="grid gap-2 py-5 sm:grid-cols-[140px_1fr] sm:items-center">
            <span className="font-mono text-xs text-muted">{c.label}</span>
            {c.href && c.value ? (
              <a
                href={c.href}
                className="break-all text-fg transition hover:text-accent"
                {...(c.external && { target: "_blank", rel: "noopener noreferrer" })}
                {...(c.label === "CV" && { download: true })}
              >
                {c.value}
                {c.external && <span aria-hidden="true"> ↗</span>}
              </a>
            ) : (
              <Placeholder>{c.label} not supplied yet (src/content/site.ts)</Placeholder>
            )}
          </li>
        ))}
      </ul>
    </Container>
  );
}
