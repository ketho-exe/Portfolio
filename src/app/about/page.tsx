import type { Metadata } from "next";
import { ButtonAnchor, Container, Eyebrow, SectionHeading } from "@/components/ui";
import { education, experience, languages } from "@/content/experience";
import { site } from "@/content/site";
import { skillGroups } from "@/content/skills";

export const metadata: Metadata = {
  title: "About",
  description: "Background, experience, skills and approach to building and automating software.",
};

const approach = [
  ["Understand", "Learn how the process works today, who uses it and what a good outcome looks like."],
  ["Design", "Choose the simplest solution that fits, and agree on data, rules and edge cases up front."],
  ["Build", "Ship usable increments with typed, readable code."],
  ["Integrate", "Connect the systems involved through clear, validated interfaces."],
  ["Automate", "Remove repetitive steps while keeping people in control of decisions."],
  ["Test and maintain", "Check the important paths and leave documentation others can follow."],
];

export default function AboutPage() {
  return (
    <Container className="pt-16 sm:pt-24">
      <Eyebrow>About</Eyebrow>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        Practical software, built to be understood and maintained.
      </h1>
      <div className="mt-8 max-w-2xl space-y-4 text-lg leading-relaxed text-muted text-pretty">
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

      <section className="mt-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow="Experience" title="Where I've worked" />
          {site.cvUrl && (
            <ButtonAnchor href={site.cvUrl} variant="secondary" download>
              Download CV
            </ButtonAnchor>
          )}
        </div>
        <ol className="mt-10 space-y-12">
          {experience.map((role) => (
            <li key={role.organisation} className="grid gap-4 border-t border-border pt-6 md:grid-cols-[220px_1fr]">
              <div>
                <p className="font-mono text-xs text-muted">{role.period}</p>
                <p className="mt-2 font-medium">{role.organisation}</p>
              </div>
              <div className="max-w-2xl">
                <h3 className="font-semibold tracking-tight">{role.title}</h3>
                <p className="mt-2 text-muted text-pretty">{role.summary}</p>
                <ul className="mt-4 space-y-2 text-sm text-muted">
                  {role.points.map((point) => (
                    <li key={point} className="flex gap-3">
                      <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
                      <span className="text-pretty">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-20">
        <SectionHeading eyebrow="Skills" title="What I use">
          I use AI-assisted development, and I can read, explain, debug and maintain what I build. The case studies show
          how each tool was applied.
        </SectionHeading>
        <dl className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {skillGroups.map((g) => (
            <div key={g.area}>
              <dt className="font-mono text-xs text-muted">{g.area}</dt>
              <dd className="mt-3 space-y-1.5 text-sm">
                {g.items.map((i) => (
                  <p key={i}>{i}</p>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-20">
        <SectionHeading eyebrow="Approach" title="How I work" />
        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {approach.map(([title, body], i) => (
            <li key={title} className="border-t border-border pt-4">
              <p className="font-mono text-xs text-accent">0{i + 1}</p>
              <h3 className="mt-2 font-medium">{title}</h3>
              <p className="mt-1 text-sm text-muted text-pretty">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-20 grid gap-10 sm:grid-cols-2">
        <div>
          <SectionHeading eyebrow="Education" title="Qualifications" />
          {education.map((e) => (
            <div key={e.title} className="mt-6">
              <p className="font-mono text-xs text-muted">{e.period}</p>
              <p className="mt-2 font-medium">{e.title}</p>
              <p className="text-sm text-muted">
                {e.organisation} · {e.detail}
              </p>
            </div>
          ))}
        </div>
        <div>
          <SectionHeading eyebrow="Languages" title="Spoken" />
          <p className="mt-6 text-sm">{languages.join(" · ")}</p>
        </div>
      </section>
    </Container>
  );
}
