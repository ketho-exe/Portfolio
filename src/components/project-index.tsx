"use client";

import Link from "next/link";
import { useState } from "react";
import type { Project } from "@/content/projects";
import { Icon } from "./icons";
import { StatusDot } from "./status";

type Filter = "all" | "pro" | "own";
const isPro = (p: Project) => p.kind === "Professional work";

/** Filterable list of every project. The featured case study shows above it unless only personal work is shown. */
export function ProjectIndex({ projects, featured }: { projects: Project[]; featured: Project }) {
  const [filter, setFilter] = useState<Filter>("all");
  const list = projects.filter((p) => filter === "all" || (filter === "pro") === isPro(p));
  const filters: [Filter, string, number][] = [
    ["all", "All", projects.length],
    ["pro", "Professional", projects.filter(isPro).length],
    ["own", "Personal & demos", projects.filter((p) => !isPro(p)).length],
  ];

  return (
    <>
      <div className="mt-14 flex flex-wrap items-center justify-between gap-4">
        <div role="group" aria-label="Filter projects" className="glass inline-flex flex-wrap gap-1 rounded-full p-[5px]">
          {filters.map(([id, label, count]) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
              className={`min-h-11 cursor-pointer rounded-full px-5 text-[15px] font-semibold transition-colors ${
                filter === id ? "bg-accent text-accent-fg" : "text-soft hover:bg-surface-2"
              }`}
            >
              {label} <span className="font-mono text-xs font-normal opacity-80">{count}</span>
            </button>
          ))}
        </div>
        <p role="status" aria-live="polite" className="font-mono text-[13px] text-muted">
          Showing {list.length} of {projects.length}
        </p>
      </div>

      {filter !== "own" && (
        <Link href={`/projects/${featured.slug}/`} className="glass lift mt-6 flex flex-wrap overflow-hidden rounded-card">
          <span className="min-w-0 flex-[999_1_520px] p-6 sm:p-9">
            <span className="block font-mono text-xs tracking-[0.06em] text-accent">FEATURED CASE STUDY</span>
            <span className="mt-3 block font-serif text-display-4 leading-none">{featured.name}</span>
            <span className="mt-3.5 block max-w-[600px] text-[17px] leading-relaxed text-soft">{featured.summary}</span>
            <span className="mt-5 inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-[15px] font-bold text-accent-fg">
              Read the case study
            </span>
          </span>
          {featured.result && (
            <span className="flex min-w-0 flex-[1_1_300px] flex-col justify-center gap-[18px] border-l border-accent-hairline bg-accent-wash p-6 sm:p-9">
              <span className="block">
                <span className="block font-mono text-[11px] text-muted">BEFORE</span>
                <span className="block font-serif text-display-5 leading-none text-soft">{featured.result.before}</span>
              </span>
              <span aria-hidden="true" className="block h-px bg-accent-hairline" />
              <span className="block">
                <span className="block font-mono text-[11px] text-accent">AFTER</span>
                <span className="block font-serif text-display-3 leading-none text-accent">{featured.result.after.replace("minutes", "min")}</span>
              </span>
            </span>
          )}
        </Link>
      )}

      <h2 className="sr-only">Project index</h2>
      <ol className="glass mt-6 overflow-hidden rounded-card">
        {list.map((p) => (
          <li key={p.slug} className="border-t border-border first:border-t-0">
            <Link
              href={`/projects/${p.slug}/`}
              prefetch={p.links?.demo === "/playground/" ? false : undefined}
              className="group flex flex-wrap items-center gap-x-7 gap-y-3 px-5 py-6 transition-colors hover:bg-accent-wash focus-visible:bg-accent-wash sm:px-7"
            >
              <span className="w-[34px] shrink-0 font-mono text-[13px] text-muted">
                {String(projects.indexOf(p) + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-[999_1_380px]">
                <span className="block font-serif text-display-5 leading-[1.05] transition-colors group-hover:text-accent">
                  {p.name}
                </span>
                <span className="mt-2 block max-w-[620px] text-[15px] leading-relaxed text-soft">{p.summary}</span>
                <span className="mt-3 flex flex-wrap gap-1.5">
                  {p.categories.map((c) => (
                    <span key={c} className="rounded-full bg-surface-2 px-2.5 py-1 font-mono text-[11px] text-soft">
                      {c}
                    </span>
                  ))}
                </span>
              </span>
              <span className="flex flex-[0_0_220px] flex-col gap-1.5 text-sm max-md:flex-[1_1_100%] max-md:flex-row max-md:flex-wrap max-md:gap-x-4">
                <span className="inline-flex items-center gap-2 font-semibold">
                  <StatusDot status={p.status} />
                  {p.status}
                </span>
                <span className="text-soft">{p.kind}</span>
                <span className="font-mono text-xs text-muted">{where(p)}</span>
              </span>
              <Icon
                name="arrowUpRight"
                size={22}
                strokeWidth={2.2}
                className="shrink-0 text-muted transition duration-300 ease-(--spring) group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-accent max-md:hidden"
              />
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}

function where(p: Project) {
  if (p.organisation) return [p.organisation.replace(" Chartered Accountants", ""), p.period?.replace("2024–2025", "2024–25")].filter(Boolean).join(" · ");
  return p.links?.demo ? "Live demo" : "";
}
