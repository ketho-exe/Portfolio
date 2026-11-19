import type { Metadata } from "next";
import { pageMetadata } from "@/app/shared-metadata";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { RolePoints } from "@/components/role-points";
import { Container, Eyebrow, SectionHeading } from "@/components/ui";
import { approach } from "@/content/approach";
import { education, experience, languages } from "@/content/experience";
import { site } from "@/content/site";
import { skillGroups } from "@/content/skills";

export const metadata: Metadata = pageMetadata("/about/", {
  title: "About",
  description: "Background, experience, skills and approach to building and automating software.",
});

// "English (fluent)" → "English · fluent"
const spoken = languages.map((l) => l.replace(/ \((.+)\)$/, " · $1"));

export default function AboutPage() {
  return (
    <Container wide className="pt-16 pb-24">
      <div className="flex flex-wrap items-start gap-x-16 gap-y-10">
        <div className="min-w-0 flex-[999_1_600px]">
          <Eyebrow>About</Eyebrow>
          <h1 className="mt-3.5 font-serif text-display-2 leading-[0.98] text-balance">
            Practical software, built to be understood and maintained.
          </h1>
          <div className="mt-8 max-w-[640px] space-y-4 text-[19px] leading-[1.65] text-soft">
            <p>
              I&apos;m a software developer with experience building business applications, automating workflows and
              integrating different software systems.
            </p>
            <p>
              My experience spans low-code development, web technologies, databases, APIs and AI-assisted software
              development. I&apos;ve worked on internal business systems, financial workflows and operational tools,
              turning manual processes into digital solutions.
            </p>
            <p>
              I&apos;m particularly interested in application development, automation and building practical software
              that solves real-world problems.
            </p>
          </div>
        </div>
        <aside aria-label="At a glance" className="flex min-w-0 flex-[1_1_340px] flex-col gap-4">
          <dl className="glass rounded-card px-5 py-2">
            {[
              ["Role", site.role],
              ["Languages", languages.map((l) => l.replace(/ \(.+\)$/, "")).join(", ")],
              ["Internal projects", "~10–15 at UPL Group"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-border py-3 last:border-b-0">
                <dt className="font-mono text-xs text-muted">{k}</dt>
                <dd className="text-right text-[15px]">{v}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>

      <section aria-labelledby="exp-title" className="mt-28">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow="Experience" title="Where I've worked" id="exp-title" />
          {site.cvUrl && (
            <a
              href={site.cvUrl}
              download
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-strong px-[18px] text-[15px] font-semibold transition-colors hover:bg-surface-2"
            >
              <Icon name="download" size={18} />
              Download CV <span className="font-mono text-xs text-muted">PDF</span>
            </a>
          )}
        </div>
        <ol className="mt-9 flex flex-col gap-5">
          {experience.map((r) => (
            <li key={r.organisation} className="flex flex-wrap gap-x-10 gap-y-5">
              <div className="max-w-[280px] flex-[1_1_220px]">
                <div className="sticky top-28">
                  <p className="font-mono text-[13px] text-accent">{r.period}</p>
                  <p className="mt-2 text-lg font-semibold">{r.organisation}</p>
                </div>
              </div>
              <article className="glass min-w-0 flex-[999_1_560px] rounded-card p-6 sm:p-[30px]">
                <h3 className="text-2xl font-semibold tracking-[-0.01em]">{r.title}</h3>
                <p className="mt-3 max-w-[720px] text-[17px] leading-relaxed text-soft">{r.summary}</p>
                <RolePoints points={r.points} />
              </article>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="skills-title" className="mt-28">
        <div className="flex flex-wrap items-end justify-between gap-x-16 gap-y-5">
          <SectionHeading eyebrow="Skills" title="What I use" id="skills-title" />
          <p className="max-w-[520px] leading-relaxed text-soft">
            I use AI-assisted development, and I can read, explain, debug and maintain what I build. The case studies
            show how each tool was applied.
          </p>
        </div>
        <dl className="mt-9 grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-4">
          {skillGroups.map((g) => (
            <div key={g.area} className="glass rounded-card p-[22px]">
              <dt className="font-mono text-xs tracking-[0.04em] text-muted">{g.area}</dt>
              <dd className="mt-3.5 flex flex-wrap gap-2">
                {g.items.map((item) => (
                  <span
                    key={item}
                    className={`inline-flex min-h-8 items-center rounded-full border px-3 text-sm ${
                      /basic/.test(item) ? "border-dashed border-border-strong text-soft" : "border-border bg-surface-2"
                    }`}
                  >
                    {item}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3.5 ml-1 font-mono text-xs text-muted">Dashed = basic familiarity. No proficiency bars on purpose.</p>
      </section>

      <section aria-labelledby="approach-title" className="mt-28">
        <SectionHeading eyebrow="Approach" title="How I work" id="approach-title" />
        <ol className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] border-t border-border">
          {approach.map(([title, body], i) => (
            <li key={title} className="flex gap-[18px] border-b border-border py-7 pr-6">
              <span aria-hidden="true" className="step-numeral font-serif text-display-3 leading-[0.8]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="mt-1 text-[19px] font-semibold">{title}</h3>
                <p className="mt-2 text-[15px] leading-normal text-soft">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-28 grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-5">
        {education.map((e, i) => (
          <section key={e.title} aria-labelledby={`edu-title-${i}`} className="glass rounded-card p-[30px]">
            <Eyebrow>Education</Eyebrow>
            <h2 id={`edu-title-${i}`} className="mt-2.5 font-serif text-display-5 leading-[1.05]">
              {e.title}
            </h2>
            <p className="mt-3 text-soft">{e.organisation}</p>
            <p className="mt-2 font-mono text-[13px] text-muted">
              {e.period} · {e.detail}
            </p>
          </section>
        ))}
        <section aria-labelledby="lang-title" className="glass rounded-card p-[30px]">
          <Eyebrow>Languages</Eyebrow>
          <h2 id="lang-title" className="mt-2.5 font-serif text-display-5 leading-[1.05]">
            Spoken
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2.5">
            {spoken.map((l) => (
              <li key={l} className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-2 px-3 text-sm">
                {l}
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="next-title" className="flex flex-col justify-between gap-5 rounded-card bg-accent p-[30px] text-accent-fg">
          <h2 id="next-title" className="font-serif text-display-5 leading-none">
            Want the details?
          </h2>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/contact/" className="inline-flex min-h-12 items-center rounded-full bg-accent-fg px-[22px] font-bold text-white">
              Get in touch
            </Link>
            <Link href="/projects/" className="inline-flex min-h-12 items-center rounded-full border-[1.5px] border-accent-fg px-[22px] font-bold">
              See the work
            </Link>
          </div>
        </section>
      </div>
    </Container>
  );
}
