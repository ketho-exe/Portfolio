import type { Metadata } from "next";
import { pageMetadata } from "@/app/shared-metadata";
import { ProjectIndex } from "@/components/project-index";
import { StatusDot, statusMeaning } from "@/components/status";
import { Container, Eyebrow } from "@/components/ui";
import { getProject, projects } from "@/content/projects";

export const metadata: Metadata = pageMetadata("/projects/", {
  title: "Work",
  description: "Professional automation, integration and web application work, plus a live automation playground.",
});

export default function ProjectsPage() {
  return (
    <Container className="pt-16 pb-24 sm:pt-[72px]">
      <div className="flex flex-wrap items-end justify-between gap-10">
        <div className="min-w-0 flex-[999_1_560px]">
          <Eyebrow>Work · {projects.length} projects</Eyebrow>
          <h1 className="mt-4 font-serif text-display-1 leading-[0.9] tracking-[-0.02em]">
            Things I&apos;ve built
          </h1>
          <p className="mt-6 max-w-[580px] text-lg leading-normal text-soft">
            Professional work for an accounting firm and a multi-business group, plus a personal project that shows what
            can&apos;t be shown from client work.
          </p>
        </div>
        <aside aria-labelledby="legend-title" className="panel max-w-[400px] flex-[1_1_320px] rounded-card px-6 py-6">
          <h2 id="legend-title" className="text-sm font-medium text-muted">
            How to read the labels
          </h2>
          <dl className="mt-4 grid gap-2 text-sm leading-snug">
            {statusMeaning.map(([status, meaning]) => (
              <div key={status} className="flex gap-2">
                <dt className="flex shrink-0 items-center gap-2 font-medium">
                  <StatusDot status={status} />
                  {status}
                </dt>
                <dd className="text-soft">{meaning}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>

      <ProjectIndex projects={projects} featured={getProject("billing-run-automation")!} />

      <p className="mt-8 max-w-[720px] text-sm leading-relaxed text-muted">
        Client and employer work is described from my CV and kept general on purpose: no proprietary code, data,
        screenshots or named sub-businesses. Where something can be shown, it&apos;s rebuilt with synthetic data in the
        playground.
      </p>
    </Container>
  );
}
