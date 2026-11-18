import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/project-card";
import { Container, Tag } from "@/components/ui";
import { caseStudySections, getProject, projects } from "@/content/projects";

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const project = getProject((await params).slug);
  return project ? { title: project.name, description: project.summary } : {};
}

export default async function CaseStudyPage({ params }: PageProps<"/projects/[slug]">) {
  const project = getProject((await params).slug);
  if (!project) notFound();

  const sections = caseStudySections.filter(([key]) => project.caseStudy[key]?.length);
  const meta = [
    ["Type", project.kind],
    ["Organisation", project.organisation],
    ["Period", project.period],
    ["Category", project.categories.join(", ")],
  ].filter((m): m is [string, string] => Boolean(m[1]));
  const isProfessional = project.kind === "Professional work";
  const isUnfinished = project.status === "Planned" || project.status === "In progress";

  return (
    <Container className="pt-12 sm:pt-16">
      <Link href="/projects/" className="text-sm text-muted transition hover:text-fg">
        ← All projects
      </Link>

      <header className="mt-8 max-w-3xl">
        <StatusBadge status={project.status} />
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{project.name}</h1>
        <p className="mt-4 text-lg text-muted text-pretty">{project.summary}</p>
        {(project.links?.demo || project.links?.source) && (
          <div className="mt-6 flex gap-4 text-sm">
            {project.links.demo && (
              <a href={project.links.demo} className="text-accent hover:underline">
                {project.links.demo.startsWith("/") ? "Try the demo →" : "Live demo ↗"}
              </a>
            )}
            {project.links.source && (
              <a href={project.links.source} className="text-accent hover:underline">
                Source code ↗
              </a>
            )}
          </div>
        )}
      </header>

      {isProfessional && (
        <p className="mt-8 max-w-3xl rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
          Professional work, described with confidential details removed. No proprietary code, client data or internal
          screenshots are shown.
        </p>
      )}
      {isUnfinished && (
        <p className="mt-8 max-w-3xl rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
          This project is {project.status.toLowerCase()}. This page describes its aims and approach and will be updated
          with implementation details, testing and outcomes as the work is completed.
        </p>
      )}

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_220px]">
        <article className="max-w-2xl space-y-10">
          {sections.map(([key, heading]) => (
            <section key={key} aria-labelledby={key}>
              <h2 id={key} className="text-lg font-semibold tracking-tight">
                {heading}
              </h2>
              <div className="mt-3 space-y-3 leading-relaxed text-muted">
                {project.caseStudy[key]!.map((para) => (
                  <p key={para.slice(0, 32)}>{para}</p>
                ))}
              </div>
            </section>
          ))}
        </article>

        <aside className="order-first lg:order-none">
          <dl className="grid grid-cols-2 gap-5 border-border text-sm lg:sticky lg:top-24 lg:block lg:space-y-5 lg:border-l lg:pl-6">
            {meta.map(([label, value]) => (
              <div key={label}>
                <dt className="font-mono text-xs text-muted">{label}</dt>
                <dd className="mt-1">{value}</dd>
              </div>
            ))}
            <div className="col-span-2">
              <dt className="font-mono text-xs text-muted">{isUnfinished ? "Planned stack" : "Stack"}</dt>
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {project.technologies.map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </Container>
  );
}
