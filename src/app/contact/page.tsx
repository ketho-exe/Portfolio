import type { Metadata } from "next";
import { pageMetadata } from "@/app/shared-metadata";
import { CopyButton } from "@/components/copy-button";
import { Icon, type IconName } from "@/components/icons";
import { ButtonAnchor, Container, Eyebrow, Note, Placeholder } from "@/components/ui";
import { site } from "@/content/site";

export const metadata: Metadata = pageMetadata("/contact/", {
  title: "Contact",
  description: `Contact ${site.name}: email, LinkedIn, GitHub and CV.`,
});

type Channel = { label: string; body: string; href: string | null; icon: IconName; external?: boolean; download?: boolean };

const channels: Channel[] = [
  { label: "LinkedIn", body: "Work history and background, if you prefer to message there.", href: site.linkedin, icon: "linkedin", external: true },
  { label: "GitHub", body: "Source for this site and the Automation Playground.", href: site.github, icon: "github", external: true },
  { label: "CV", body: "Experience, skills and education on one page.", href: site.cvUrl, icon: "download", download: true },
];

const brief = [
  "What happens today, step by step, and who does it.",
  "The tools involved: spreadsheets, email, accounting or other systems.",
  "Roughly how often it runs and how long it takes.",
];

export default function ContactPage() {
  return (
    <Container wide className="pt-16 pb-24 sm:pt-[72px]">
      <Eyebrow>Contact</Eyebrow>
      <h1 className="mt-4 font-serif text-display-1 leading-[0.85] tracking-[-0.02em]">
        Let&apos;s talk
      </h1>
      <p className="mt-6 max-w-[620px] text-xl leading-relaxed text-soft">
        Get in touch about software development and automation work, or a process you&apos;d like to take the manual
        work out of.
      </p>

      <section aria-labelledby="mail-title" className="panel mt-14 rounded-card p-6 sm:p-9">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0">
            <h2 id="mail-title" className="text-sm font-medium text-muted">
              Email, the best way to reach me
            </h2>
            {site.email ? (
              <a
                href={`mailto:${site.email}`}
                className="mt-4 inline-block font-serif text-display-4 leading-none underline decoration-border-strong decoration-1 underline-offset-[0.15em] transition-colors hover:decoration-fg [overflow-wrap:anywhere]"
              >
                {site.email}
              </a>
            ) : (
              <div className="mt-4">
                <Placeholder>Email not supplied yet (src/content/site.ts)</Placeholder>
              </div>
            )}
          </div>
          {site.email && (
            <div className="flex flex-wrap items-center gap-2">
              <CopyButton text={site.email} label="Copy address" />
              <ButtonAnchor href={`mailto:${site.email}`} className="min-h-11 px-5 text-base">
                Write an email
              </ButtonAnchor>
            </div>
          )}
        </div>
        <div className="mt-7 border-t border-border pt-6">
          <h3 className="text-base font-medium">Writing about a process? It helps to mention:</h3>
          <ol className="mt-4 grid gap-x-8 gap-y-3 md:grid-cols-3">
            {brief.map((b, i) => (
              <li key={b} className="flex gap-3 text-base leading-normal text-soft">
                <span aria-hidden="true" className="font-mono text-sm leading-relaxed text-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-pretty">{b}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="more-title" className="mt-5">
        <h2 id="more-title" className="sr-only">
          Other ways to connect
        </h2>
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-5">
          {channels.map((c) => (
            <li key={c.label}>
              {c.href ? (
                <a
                  href={c.href}
                  className="panel lift group relative flex h-full flex-col gap-3 rounded-card p-6"
                  {...(c.external && { target: "_blank", rel: "noopener noreferrer" })}
                  {...(c.download && { download: true })}
                >
                  <Icon name={c.icon} size={20} strokeWidth={1.5} className="text-muted" />
                  <span className="text-xl font-medium">
                    {c.download ? "Download CV" : c.label}
                    {c.download && <span className="ml-2 font-mono text-xs font-medium text-muted">PDF</span>}
                  </span>
                  <span className="text-base leading-normal text-soft">{c.body}</span>
                  {c.external && <span className="sr-only">(opens in a new tab)</span>}
                  <Icon
                    name={c.download ? "download" : "arrowUpRight"}
                    size={20}
                    strokeWidth={1.5}
                    className="absolute top-6 right-6 text-muted transition-colors group-hover:text-fg"
                  />
                </a>
              ) : (
                <Placeholder>{c.label} not supplied yet (src/content/site.ts)</Placeholder>
              )}
            </li>
          ))}
        </ul>
      </section>

      <Note icon={<Icon name="info" size={20} />} className="mt-14">
        There&apos;s no contact form: this is a static site with no server and no tracking, so nothing you&apos;d type here
        could be stored safely. Email goes straight to me.
      </Note>
    </Container>
  );
}
