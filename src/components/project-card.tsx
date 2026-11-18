import Link from "next/link";
import type { Project } from "@/content/projects";
import { Tag } from "./ui";

export function StatusBadge({ status }: { status: Project["status"] }) {
  const dot = status === "Live" ? "bg-accent" : status === "In progress" ? "bg-amber-500" : "bg-muted";
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-xs text-muted">
      <span aria-hidden="true" className={`size-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  );
}

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="group relative flex flex-col rounded-xl border border-border bg-surface p-5 transition hover:border-muted/60">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs text-muted">{project.categories.join(" · ")}</p>
        <StatusBadge status={project.status} />
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight">
        <Link href={`/projects/${project.slug}/`} className="after:absolute after:inset-0 after:rounded-xl">
          {project.name}
        </Link>
      </h3>
      <p className="mt-2 text-sm text-muted text-pretty">{project.summary}</p>
      <div className="mt-auto flex flex-wrap gap-1.5 pt-5">
        {project.technologies.map((t) => (
          <Tag key={t}>{t}</Tag>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">
        {project.kind}
        <span aria-hidden="true" className="ml-1 inline-block transition group-hover:translate-x-0.5 group-hover:text-accent">
          →
        </span>
      </p>
    </article>
  );
}
