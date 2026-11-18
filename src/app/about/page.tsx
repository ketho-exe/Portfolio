import type { Metadata } from "next";
import { Container, Eyebrow, Placeholder, SectionHeading } from "@/components/ui";
import { skillGroups } from "@/content/skills";

export const metadata: Metadata = {
  title: "About",
  description: "Background, skills and approach to building and automating software.",
};

const approach = [
  ["Understand", "Learn how the process works today, who uses it and what a good outcome looks like."],
  ["Design", "Choose the simplest solution that fits, and agree on data, rules and edge cases up front."],
  ["Build", "Ship usable increments with typed, readable code."],
  ["Integrate", "Connect the systems involved through clear, validated interfaces."],
  ["Automate", "Remove repetitive steps while keeping people in control of decisions."],
  ["Test and maintain", "Cover the important paths with tests and leave documentation others can follow."],
];

export default function AboutPage() {
  return (
    <Container className="pt-16 sm:pt-24">
      <Eyebrow>About</Eyebrow>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        Practical software, built to be understood and maintained.
      </h1>
      <div className="mt-8 max-w-2xl">
        <Placeholder>Short professional background in the owner&apos;s own words</Placeholder>
      </div>

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

      <section className="mt-20">
        <SectionHeading eyebrow="Skills" title="What I use">
          Grouped by area. The case studies show how each is applied in practice.
        </SectionHeading>
        <dl className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
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
        <SectionHeading eyebrow="Experience" title="Background" />
        <div className="mt-8 max-w-2xl">
          <Placeholder>Roles, dates and responsibilities that can be shared publicly</Placeholder>
        </div>
      </section>
    </Container>
  );
}
