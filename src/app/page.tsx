import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { pageMetadata } from "@/app/shared-metadata";
import { HeroRunCard } from "@/components/hero-run-card";
import { Icon } from "@/components/icons";
import { ButtonLink, Eyebrow } from "@/components/ui";
import { approach } from "@/content/approach";
import { byline, getProject } from "@/content/projects";
import { site } from "@/content/site";
import { heroRun } from "@/features/playground/hero-run";
import { workflows } from "@/features/playground/workflows";

// Figures below come from src/content (owner's CV). Don't add numbers that aren't there.
const readouts = [
  { value: "200–400", label: "CSV invoices processed automatically each week", context: "Accounting firm" },
  { value: "~10", label: "staff moved off spreadsheets and paper", context: "Facilities app" },
  { value: "10–15", label: "internal projects contributed to across the group", context: "UPL Group, 2026" },
];

const workCards = ["facilities-management-app", "document-intake-pipeline", "glide-apps-xero-integration"];

export const metadata: Metadata = pageMetadata("/");

/** Stagger index for the hero's one entrance. */
const d = (n: number) => ({ "--d": n }) as CSSProperties;

export default async function Home() {
  const billing = getProject("billing-run-automation")!;
  const run = await heroRun();

  return (
    <>
      {/* Hero: text beside a real run of the invoice workflow */}
      <section
        aria-labelledby="hero-title"
        className="mx-auto grid max-w-[1200px] items-center gap-x-14 gap-y-12 px-4 pt-12 pb-24 sm:px-6 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,640px)] lg:pb-32"
      >
        <div className="min-w-0">
          <Eyebrow className="pop">Software developer · Automation · Integrations</Eyebrow>
          <h1
            id="hero-title"
            style={d(1)}
            className="pop mt-4 font-serif text-display-2 leading-[0.98] tracking-[-0.01em] text-balance lg:text-[clamp(56px,5.6vw,84px)]"
          >
            Quietly taking <em className="hl hl-draw not-italic">hours</em> out of the working week
          </h1>
          <p style={d(2)} className="pop mt-6 max-w-[560px] text-lg leading-relaxed text-soft">
            I&apos;m {site.firstName}. Since 2024 I&apos;ve built internal business apps, workflow automation and
            integrations for an accounting firm and a multi-business group.
          </p>
          <div style={d(3)} className="pop mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/projects/">
              See the work
              <Icon name="arrowRight" size={16} strokeWidth={1.5} />
            </ButtonLink>
            <ButtonLink href="/playground/" prefetch={false} variant="secondary">
              Run a workflow
            </ButtonLink>
          </div>
        </div>
        <HeroRunCard run={run} className="pop" style={d(4)} />
      </section>

      {/* Highlights */}
      <section
        aria-labelledby="highlights-title"
        className="mx-auto grid max-w-[1200px] gap-4 px-4 pb-32 sm:px-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
      >
        <h2 id="highlights-title" className="sr-only">
          Highlights
        </h2>
        {billing.result && (
          <figure className="panel m-0 flex flex-col justify-between gap-12 rounded-card p-6 sm:p-8">
            <p className="text-sm text-muted">Weekly billing run · time per run</p>
            <div>
              <p className="font-serif text-display-5 leading-none text-muted">
                <span className="sr-only">Before: </span>
                <s className="decoration-1">{billing.result.before}</s>
              </p>
              <p className="mt-3 font-serif text-display-2 leading-none">
                <span className="sr-only">After: </span>
                <span className="hl">{billing.result.after}</span>
              </p>
            </div>
            <figcaption className="text-sm leading-relaxed text-muted">
              At an accounting firm, as its sole automation developer · {billing.technologies.join(", ")}
            </figcaption>
          </figure>
        )}
        <dl className="panel m-0 flex flex-col rounded-card">
          {readouts.map((r) => (
            <div key={r.value} className="flex flex-1 flex-col justify-center border-t border-border px-6 py-6 first:border-t-0 sm:px-8">
              <dt className="order-2 mt-2 text-base leading-snug text-soft">
                {r.label}
                <span className="block font-mono text-xs text-muted">{r.context}</span>
              </dt>
              <dd className="order-1 font-serif text-display-5 leading-none tabular-nums">{r.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Selected work */}
      <section aria-labelledby="work-title" className="mx-auto max-w-[1200px] px-4 pb-32 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <Eyebrow>Selected work</Eyebrow>
            <h2 id="work-title" className="mt-3 font-serif text-display-3 leading-none">
              Shipped for real businesses
            </h2>
          </div>
          <Link href="/projects/" className="inline-flex min-h-11 items-center gap-2 text-soft hover:text-fg">
            All projects
            <Icon name="chevronRight" size={16} strokeWidth={1.5} />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-4">
          <Link
            href={`/projects/${billing.slug}/`}
            className="panel lift col-span-full flex flex-wrap items-end justify-between gap-8 rounded-card p-6 sm:p-8"
          >
            <span className="min-w-0 flex-[999_1_520px]">
              <span className="block font-mono text-xs text-muted">
                Cover story · Automation · {billing.periodShort ?? billing.period}
              </span>
              <span className="mt-3 block font-serif text-display-4 leading-[1.02]">{billing.headline}</span>
              <span className="mt-4 block max-w-[620px] text-lg leading-relaxed text-soft">
                The weekly invoice run at an accounting firm, prepared from CSV. As its sole automation developer, I
                automated it end to end.
              </span>
            </span>
            <span className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-control border border-border-strong px-5 font-medium">
              Read the case study
              <Icon name="chevronRight" size={16} strokeWidth={1.5} />
            </span>
          </Link>
          {workCards.map((slug) => {
            const p = getProject(slug)!;
            return (
              <Link key={slug} href={`/projects/${slug}/`} className="panel lift flex min-h-56 flex-col gap-3 rounded-card p-6">
                <span className="font-mono text-xs text-muted">{byline(p)}</span>
                <span className="text-xl font-medium">{p.name}</span>
                <span className="text-base leading-relaxed text-soft">{p.summary}</span>
                <span className="mt-auto pt-2 font-mono text-xs text-muted">{p.technologies.slice(0, 4).join(" · ")}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Approach */}
      <section aria-labelledby="approach-title" className="mx-auto max-w-[1200px] px-4 pb-32 sm:px-6">
        <Eyebrow>How I work</Eyebrow>
        <h2 id="approach-title" className="mt-3 max-w-[760px] font-serif text-display-3 leading-none">
          From the problem to software that keeps working
        </h2>
        <ol className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(176px,1fr))] gap-x-4 gap-y-8">
          {approach.map(([title, body], i) => (
            <li key={title} className="border-t border-border-strong pt-6">
              <span className="block font-mono text-xs text-muted tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <span className="mt-2 block text-lg font-medium">{title}</span>
              <span className="mt-2 block text-sm leading-relaxed text-soft">{body}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Playground */}
      <section aria-labelledby="pg-title" className="mx-auto max-w-[1200px] px-4 pb-32 sm:px-6">
        <div className="panel grid overflow-hidden rounded-card lg:grid-cols-[minmax(0,1fr)_440px]">
          <div className="min-w-0 p-6 sm:p-12">
            <Eyebrow>Personal project · live</Eyebrow>
            <h2 id="pg-title" className="mt-3 font-serif text-display-3 leading-none">
              Don&apos;t read about it. Run it.
            </h2>
            <p className="mt-6 max-w-[520px] text-lg leading-relaxed text-soft">
              Three business workflows execute step by step in your browser. Drop in your own PDF or email; it never
              leaves your device.
            </p>
            <ButtonLink href="/playground/" prefetch={false} className="mt-8">
              Open the playground
            </ButtonLink>
          </div>
          <ul
            aria-label="Workflows in the playground"
            className="flex min-w-0 flex-col justify-center border-border bg-code p-6 max-lg:border-t sm:p-12 lg:border-l"
          >
            {workflows.map((wf) => (
              <li key={wf.definition.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-border py-4 first:border-t-0">
                <span className="text-lg">{wf.definition.name}</span>
                <span className="shrink-0 font-mono text-xs text-muted tabular-nums">
                  {wf.definition.nodes.length} steps · {wf.samples.length} samples
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Call to action */}
      <section aria-labelledby="cta-title" className="mx-auto max-w-[1200px] px-4 pb-24 text-center sm:px-6">
        <h2 id="cta-title" className="mx-auto max-w-[900px] font-serif text-display-2 leading-[0.96]">
          Got a process stuck in spreadsheets?
        </h2>
        <p className="mx-auto mt-6 max-w-[520px] text-lg leading-relaxed text-soft">
          Tell me how it works today. I&apos;ll tell you how I&apos;d approach it.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/contact/">Get in touch</ButtonLink>
          <ButtonLink href="/about/" variant="secondary">
            More about me
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
