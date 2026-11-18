import type { Metadata } from "next";
import { Container, Eyebrow, Placeholder } from "@/components/ui";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Email, LinkedIn, GitHub and CV.",
};

export default function ContactPage() {
  const channels = [
    { label: "Email", value: site.email, href: site.email ? `mailto:${site.email}` : null },
    { label: "LinkedIn", value: site.linkedin, href: site.linkedin },
    { label: "GitHub", value: site.github, href: site.github },
    { label: "CV", value: site.cvUrl ? "Download PDF" : null, href: site.cvUrl },
  ];

  return (
    <Container className="pt-16 sm:pt-24">
      <Eyebrow>Contact</Eyebrow>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        Let&apos;s talk.
      </h1>
      <p className="mt-4 max-w-xl text-muted text-pretty">
        I&apos;m interested in developer roles across web applications, automation and integrations. Email is the
        quickest way to reach me.
      </p>

      <ul className="mt-12 max-w-2xl divide-y divide-border border-y border-border">
        {channels.map((c) => (
          <li key={c.label} className="grid gap-2 py-5 sm:grid-cols-[140px_1fr] sm:items-center">
            <span className="font-mono text-xs text-muted">{c.label}</span>
            {c.href && c.value ? (
              <a href={c.href} className="break-all text-fg transition hover:text-accent">
                {c.value}
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
