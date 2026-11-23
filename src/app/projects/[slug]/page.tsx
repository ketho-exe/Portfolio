import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/app/shared-metadata";
import { Fragment } from "react";
import { Icon } from "@/components/icons";
import { ButtonLink, buttonClass, Note } from "@/components/ui";
import { byline, caseStudySections, getProject, projects, type CaseStudyKey, type Project } from "@/content/projects";

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const project = getProject((await params).slug);
  return project ? pageMetadata(`/projects/${project.slug}/`, { title: project.name, description: project.summary }) : {};
}

// Long articles get a contents list beside them from 1024px (stacked above on smaller screens).
const columns = "mx-auto grid max-w-[1200px] gap-12 px-4 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-x-16";
const single = "mx-auto max-w-[1200px] px-4 sm:px-6";
/** Below this, the reading-progress bar and "On this page" list are noise. */
const LONG_ARTICLE_WORDS = 500;

export default async function CaseStudyPage({ params }: PageProps<"/projects/[slug]">) {
  const project = getProject((await params).slug);
  if (!project) notFound();

  const sections = caseStudySections.filter(([key]) => project.caseStudy[key]?.length);
  // A process figure splits the article after "Solution" (or after the first sections if there's none).
  const splitAt = project.flow ? sections.findIndex(([k]) => k === "solution") + 1 || sections.length : sections.length;
  const first = sections.slice(0, splitAt);
  const rest = sections.slice(splitAt);
  const words = Object.values(project.caseStudy).flat().join(" ").split(" ").filter(Boolean).length;
  const long = words > LONG_ARTICLE_WORDS;
  const ask = (
    <ButtonLink href="/contact/" variant="secondary" className="min-h-11 px-4 text-sm">
      Ask me about this
    </ButtonLink>
  );

  const isProfessional = project.kind === "Professional work";
  const isUnfinished = project.status === "In progress";
  const meta = [
    ["Organisation", project.organisation],
    ["Period", project.period],
    ["Type", project.kind],
    ["Stack", project.technologies.join(" · ")],
  ].filter((m): m is [string, string] => Boolean(m[1]));

  const i = projects.indexOf(project);
  const prev = projects[(i - 1 + projects.length) % projects.length];
  const next = projects[(i + 1) % projects.length];

  const section = (key: CaseStudyKey, heading: string) => (
    <Fragment key={key}>
      <section id={key} aria-labelledby={`h-${key}`} className="mb-14 last:mb-0">
        <h2 id={`h-${key}`} className="mb-4 font-serif text-display-5 leading-[1.05]">
          {heading}
        </h2>
        {project.caseStudy[key]!.map((para) => (
          <p key={para.slice(0, 40)} className="mb-4 text-lg leading-[1.75] text-soft">
            {para}
          </p>
        ))}
        {key === "outcome" && isProfessional && (
          <Note icon={<Icon name="lock" size={22} />} className="mt-2">
            Confidential work: no code, data or screenshots are shown here. Ask me and I&apos;ll walk you through the
            approach in more detail.
          </Note>
        )}
      </section>
      {key === "contribution" && project.pullQuote && (
        <p aria-hidden="true" className="-mt-4 mb-14 border-l-2 border-border-strong pl-6 font-serif text-display-5 leading-[1.1]">
          {project.pullQuote}
        </p>
      )}
    </Fragment>
  );

  return (
    <article className="pb-24">
      {/* Reading progress, drawn along the bottom of the header (scroll-driven; static where unsupported). */}
      {long && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-[calc(var(--header-h)-1px)] z-30 px-4 sm:px-6">
          <div className="relative mx-auto h-0.5 max-w-[1200px]">
            <span className="read-progress" />
          </div>
        </div>
      )}

      <header className="mx-auto max-w-[1200px] px-4 pt-14 sm:px-6">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap gap-2 font-mono text-sm text-muted">
            <li>
              <Link href="/" className="text-soft underline underline-offset-4">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/projects/" className="text-soft underline underline-offset-4">
                Work
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <span aria-current="page">{project.name}</span>
            </li>
          </ol>
        </nav>

        <div className="mt-8 flex flex-wrap gap-2 font-mono text-xs">
          <span className="rounded-chip bg-surface-2 px-3 py-1 text-fg">{project.kind}</span>
          <span className="rounded-chip border border-border-strong px-3 py-1">{project.status}</span>
          <span className="rounded-chip border border-border-strong px-3 py-1">{project.categories.join(" · ")}</span>
        </div>
        <h1 className="mt-6 max-w-[1000px] font-serif text-display-1 leading-[0.94] tracking-[-0.02em] text-balance">
          {project.headline ?? project.name}
        </h1>
        {project.headline && <p className="mt-3 font-mono text-sm text-muted">{project.name}</p>}
        <p className="mt-6 max-w-[720px] text-xl leading-normal text-soft">{project.summary}</p>

        {(project.links?.demo || project.links?.source) && (
          <div className="mt-7 flex flex-wrap gap-3">
            {project.links.demo && (
              <ButtonLink href={project.links.demo} prefetch={project.links.demo === "/playground/" ? false : undefined}>
                <Icon name="play" size={14} />
                Try the demo
              </ButtonLink>
            )}
            {project.links.source && (
              <a
                href={project.links.source}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass("secondary")}
              >
                <Icon name="github" size={16} />
                Source code
                <Icon name="arrowUpRight" size={16} />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
          </div>
        )}

        <dl className="panel mt-10 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] overflow-hidden rounded-card">
          {meta.map(([label, value]) => (
            <div key={label} className="border-r border-b border-border px-6 py-5">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="mt-2 font-medium">{value}</dd>
            </div>
          ))}
        </dl>

        {isUnfinished && (
          <Note icon={<Icon name="info" size={20} />} className="mt-5">
            This project is still in progress. This page will be updated with testing and outcomes as the work is
            completed.
          </Note>
        )}
      </header>

      {project.result && (
        <section aria-label="Result" className="mx-auto max-w-[1200px] px-4 pt-4 sm:px-6">
          <div className="panel grid rounded-card sm:grid-cols-2">
            <div className="p-6 sm:p-8">
              <p className="text-sm text-muted">Before, {project.result.per}</p>
              <p className="mt-3 font-serif text-display-3 leading-none text-muted">{project.result.before}</p>
            </div>
            <div className="border-border p-6 max-sm:border-t sm:border-l sm:p-8">
              <p className="text-sm text-muted">After, {project.result.per}</p>
              <p className="mt-3 font-serif text-display-3 leading-none">
                <span className="hl">{project.result.after}</span>
              </p>
            </div>
          </div>
        </section>
      )}

      {long ? (
        <div className={`${columns} pt-20`}>
          <div className="lg:sticky lg:top-28 lg:self-start">
            <nav aria-label="On this page" className="text-base">
              <p className="mb-3 text-sm text-muted">On this page</p>
              {sections.map(([key, heading]) => (
                <a
                  key={key}
                  href={`#${key}`}
                  className="block border-l-2 border-border px-4 py-2 text-soft transition-colors hover:border-fg hover:text-fg"
                >
                  {heading}
                </a>
              ))}
            </nav>
            <div className="mt-7">{ask}</div>
          </div>
          <div className="max-w-[760px] min-w-0">{first.map(([k, h]) => section(k, h))}</div>
        </div>
      ) : (
        <div className={`${single} pt-20`}>
          <div className="max-w-[760px] min-w-0">{first.map(([k, h]) => section(k, h))}</div>
        </div>
      )}

      {project.flow && (
        <figure aria-labelledby="fig-cap" className="mx-auto mt-2 max-w-[1200px] px-4 sm:px-6">
          <div className="panel blueprint overflow-hidden rounded-card p-6 sm:p-8">
            <div className="flex flex-wrap justify-between gap-2 font-mono text-xs text-muted">
              <span>Fig. 1 — {project.name}</span>
            </div>
            <ol className="mt-7 flex flex-wrap items-stretch gap-y-3">
              {project.flow.map((f, n) => (
                <li key={f.title} className="flex min-w-0 flex-[1_1_180px] items-center">
                  <div className="flex min-h-36 flex-auto flex-col gap-2 rounded-panel border border-border-strong bg-bg/70 p-4">
                    <span className="flex justify-between gap-2 font-mono text-xs text-muted">
                      <span>{String(n + 1).padStart(2, "0")}</span>
                      <span>{f.tool}</span>
                    </span>
                    <span className="text-lg font-medium">{f.title}</span>
                    <span className="text-sm leading-normal text-soft">{f.body}</span>
                  </div>
                  {n < project.flow!.length - 1 && (
                    <svg aria-hidden="true" width="34" height="20" viewBox="0 0 34 20" className="shrink-0">
                      <path d="M2 10h26" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="4 4" />
                      <path d="m24 4 6 6-6 6" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </li>
              ))}
            </ol>
          </div>
          <figcaption id="fig-cap" className="mt-3 text-sm text-muted">
            The process in {project.flow.length} stages. Simplified: no client data, templates or code are shown.
          </figcaption>
        </figure>
      )}

      {rest.length > 0 && (
        <div className={`${long ? columns : single} pt-[72px]`}>
          {long && <div aria-hidden="true" className="max-lg:hidden" />}
          <div className="max-w-[760px] min-w-0">{rest.map(([k, h]) => section(k, h))}</div>
        </div>
      )}

      {!long && <div className={`${single} pt-10`}>{ask}</div>}

      <nav aria-label="More case studies" className="mx-auto max-w-[1200px] px-4 pt-24 sm:px-6">
        <p className="mb-4 text-sm text-muted">Keep reading</p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-5">
          {[
            ["← Previous", prev],
            ["Next →", next],
          ].map(([label, p], n) => {
            const proj = p as Project;
            return (
              <Link
                key={String(label)}
                href={`/projects/${proj.slug}/`}
                className={`panel lift flex flex-col gap-2 rounded-card p-7 ${n === 1 ? "sm:text-right" : ""}`}
              >
                <span className="font-mono text-xs text-muted">
                  {String(label)} · {byline(proj) || proj.kind}
                </span>
                <span className="font-serif text-display-5 leading-[1.05]">{proj.name}</span>
                <span className="text-base leading-relaxed text-soft">{proj.summary}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </article>
  );
}
