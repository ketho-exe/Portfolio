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
      <h1 className="mt-3.5 font-serif text-display-1 leading-[0.85] tracking-[-0.02em]">
        Let&apos;s talk.
      </h1>
      <p className="mt-7 max-w-[620px] text-xl leading-relaxed text-soft">
        Get in touch about software development and automation work, or a process you&apos;d like to take the manual
        work out of.
      </p>

      <section aria-labelledby="mail-title" className="glass mt-14 rounded-card p-6 sm:p-9">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0">
            <h2 id="mail-title" className="font-mono text-xs font-medium tracking-[0.08em] text-muted">
              EMAIL · THE BEST WAY TO REACH ME
            </h2>
            {site.email ? (
              <a
                href={`mailto:${site.email}`}
                className="underline-grow mt-3.5 inline-block font-serif text-display-4 leading-none [overflow-wrap:anywhere]"
              >
                {site.email}
              </a>
            ) : (
              <div className="mt-3.5">
                <Placeholder>Email not supplied yet (src/content/site.ts)</Placeholder>
              </div>
            )}
          </div>
          {site.email && (
            <div className="flex flex-wrap items-center gap-2.5">
              <CopyButton text={site.email} label="Copy address" />
              <ButtonAnchor href={`mailto:${site.email}`} className="min-h-11 px-5 text-[15px]">
                Write an email
              </ButtonAnchor>
            </div>
          )}
        </div>
        <div className="mt-7 border-t border-border pt-6">
          <h3 className="text-[15px] font-semibold">Writing about a process? It helps to mention:</h3>
          <ol className="mt-4 grid gap-x-8 gap-y-3 md:grid-cols-3">
            {brief.map((b, i) => (
              <li key={b} className="flex gap-3 text-[15px] leading-normal text-soft">
                <span aria-hidden="true" className="font-mono text-[13px] leading-[1.6] text-accent">
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
                  className="glass group relative flex h-full flex-col gap-3.5 rounded-card p-[26px] transition duration-300 ease-(--spring) hover:-translate-y-1 hover:border-accent-line"
                  {...(c.external && { target: "_blank", rel: "noopener noreferrer" })}
                  {...(c.download && { download: true })}
                >
                  <span aria-hidden="true" className="flex size-[52px] items-center justify-center rounded-panel bg-accent-soft text-accent">
                    <Icon name={c.icon} size={24} />
                  </span>
                  <span className="text-[22px] font-semibold">
                    {c.download ? "Download CV" : c.label}
                    {c.download && <span className="ml-2 font-mono text-xs font-medium text-muted">PDF</span>}
                  </span>
                  <span className="text-[15px] leading-normal text-soft">{c.body}</span>
                  {c.external && <span className="sr-only">(opens in a new tab)</span>}
                  <Icon
                    name={c.download ? "download" : "arrowUpRight"}
                    size={20}
                    className="absolute top-[26px] right-6 transition-transform group-hover:translate-x-[3px] group-hover:-translate-y-[3px]"
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
