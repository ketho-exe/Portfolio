import Link from "next/link";
import { PipelineMotif } from "@/components/pipeline-motif";
import { ProjectCard } from "@/components/project-card";
import { ButtonAnchor, ButtonLink, Container, Eyebrow, SectionHeading } from "@/components/ui";
import { projects } from "@/content/projects";
import { site } from "@/content/site";
import { skillGroups } from "@/content/skills";

const capabilities = [
  {
    title: "Web applications",
    body: "Responsive, accessible interfaces and the data layer behind them, built with React, Next.js and TypeScript.",
  },
  {
    title: "Business automation",
    body: "Mapping repetitive processes into reliable workflows with validation, approval rules and clear audit trails.",
  },
  {
    title: "Integrations",
    body: "Connecting applications through REST APIs and webhooks, with integrations kept behind well-defined adapters.",
  },
  {
    title: "Testing and maintenance",
    body: "Typed code, automated checks and practical documentation so software stays dependable after launch.",
  },
];

export default function Home() {
  const featured = projects.filter((p) => p.featured);

  return (
    <>
      <section className="pt-16 pb-20 sm:pt-24 sm:pb-28">
        <Container>
          <Eyebrow>{site.tagline}</Eyebrow>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            I design, build and automate software for real business problems.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted text-pretty">
            I&apos;m {site.firstName}, a {site.role.toLowerCase()}. Since 2024 I&apos;ve built internal business
            applications, workflow automation and integrations for an accounting firm and a multi-business group.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/projects/">View projects</ButtonLink>
            <ButtonLink href="/contact/" variant="secondary">
              Get in touch
            </ButtonLink>
            {site.cvUrl && (
              <ButtonAnchor href={site.cvUrl} variant="secondary" download>
                Download CV
              </ButtonAnchor>
            )}
          </div>
          <div className="mt-16 max-w-2xl">
            <PipelineMotif />
          </div>
        </Container>
      </section>

      <section className="border-t border-border/60 py-20">
        <Container>
          <SectionHeading eyebrow="What I do" title="From problem to working software" />
          <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
            {capabilities.map((c) => (
              <div key={c.title} className="bg-bg p-6">
                <h3 className="font-medium">{c.title}</h3>
                <p className="mt-2 text-sm text-muted text-pretty">{c.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-border/60 py-20">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading eyebrow="Selected work" title="Projects" />
            <Link href="/projects/" className="text-sm text-muted transition hover:text-fg">
              All projects →
            </Link>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {featured.map((p) => (
              <ProjectCard key={p.slug} project={p} />
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-border/60 py-20">
        <Container>
          <SectionHeading eyebrow="Toolkit" title="Technologies I work with" />
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
        </Container>
      </section>

      <section className="py-20">
        <Container>
          <div className="rounded-2xl border border-border bg-surface px-6 py-12 sm:px-12">
            <h2 className="max-w-xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Looking for a developer who can build and automate?
            </h2>
            <p className="mt-3 max-w-xl text-muted">
              I&apos;m looking for junior software, application and automation developer roles.
            </p>
            <div className="mt-8">
              <ButtonLink href="/contact/">Contact details</ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
