import type { Metadata } from "next";
import { ProjectIndex } from "@/components/project-index";
import { StatusDot, statusMeaning } from "@/components/status";
import { Container, Em, Eyebrow } from "@/components/ui";
import { getProject, projects } from "@/content/projects";

export const metadata: Metadata = {
  title: "Work",
  description: "Professional automation, integration and web application work, plus a live automation playground.",
};

export default function ProjectsPage() {
  return (
    <Container className="pt-16 pb-24 sm:pt-[72px]">
      <div className="flex flex-wrap items-end justify-between gap-10">
        <div className="min-w-0 flex-[999_1_560px]">
          <Eyebrow>Work · {projects.length} projects</Eyebrow>
          <h1 className="mt-3.5 font-serif text-[clamp(64px,9vw,140px)] leading-[0.9] tracking-[-0.02em]">
            Things I&apos;ve <Em>built</Em>.
          </h1>
          <p className="mt-6 max-w-[580px] text-[19px] leading-normal text-soft">
            Professional work for an accounting firm and a multi-business group, plus a personal project that shows what
            can&apos;t be shown from client work.
          </p>
        </div>
        <aside aria-labelledby="legend-title" className="glass max-w-[400px] flex-[1_1_320px] rounded-3xl px-6 py-[22px]">
          <h2 id="legend-title" className="font-mono text-xs font-medium tracking-[0.06em] text-muted">
            HOW TO READ THE LABELS
          </h2>
          <dl className="mt-3.5 grid gap-2.5 text-sm leading-snug">
            {statusMeaning.map(([status, meaning]) => (
              <div key={status} className="flex gap-2.5">
                <dt className="flex shrink-0 items-center gap-2 font-semibold">
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

      <p className="mt-7 max-w-[720px] text-sm leading-relaxed text-muted">
        Client and employer work is described from my CV and kept general on purpose: no proprietary code, data,
        screenshots or named sub-businesses. Where something can be shown, it&apos;s rebuilt with synthetic data in the
        playground.
      </p>
    </Container>
  );
}
