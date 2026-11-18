import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { ButtonLink, Em, Eyebrow } from "@/components/ui";
import { getProject, type Project } from "@/content/projects";
import { site } from "@/content/site";

// Figures below come from src/content (owner's CV). Don't add numbers that aren't there.
const stations = [
  { name: "READ", tool: "OCR · CSV · .eml" },
  { name: "CHECK", tool: "validate · totals" },
  { name: "ROUTE", tool: "rules · classify" },
  { name: "SYNC", tool: "Xero · SharePoint" },
];
const beltItems = [
  { label: "INVOICE.csv", delay: "-4s" },
  { label: "SCAN.pdf", delay: "-13s" },
];

// The expense approval workflow's steps, as run in the playground.
const demoSteps = [
  ["Transaction submitted", "trigger"],
  ["Validate transaction", "validate"],
  ["Map to account code", "transform"],
  ["Auto-approval policy?", "condition"],
  ["Manager approval", "simulated"],
  ["Post to accounting", "simulated"],
];

const readouts = [
  { code: "THROUGHPUT / WEEK", value: "200–400", label: "CSV invoices processed automatically" },
  { code: "USERS / FACILITIES APP", value: "~10", label: "staff moved off spreadsheets and paper" },
  { code: "INTERNAL PROJECTS / UPL", value: "10–15", label: "contributed to across the group in 2026" },
];

const workCards: { slug: string; icon: IconName; tint: string }[] = [
  { slug: "facilities-management-app", icon: "building", tint: "#1f7f92" },
  { slug: "document-intake-pipeline", icon: "scan", tint: "#5e5ce6" },
  { slug: "glide-apps-xero-integration", icon: "grid", tint: "#c2410c" },
];

const approach = [
  ["Understand", "How the process works today, who uses it, what a good outcome looks like."],
  ["Design", "The simplest solution that fits. Data, rules and edge cases agreed up front."],
  ["Build", "Usable increments with typed, readable code."],
  ["Integrate", "Systems connected through clear, validated interfaces."],
  ["Automate", "Repetitive steps removed, people kept in control of decisions."],
  ["Maintain", "Important paths tested, documentation others can follow."],
];

const sampleLog = [
  ["01", "trigger    file received"],
  ["02", "validate   type, size, pages"],
  ["03", "extract    text read on device"],
  ["04", "extract    fields + confidence"],
  ["05", "output     JSON / CSV ready"],
];

const byline = (p: Project) => [p.organisation?.replace(" Chartered Accountants", ""), p.period?.replace("2024–2025", "2024–25")].filter(Boolean).join(" · ");

export default function Home() {
  const billing = getProject("billing-run-automation")!;

  return (
    <>
      {/* Hero */}
      <section aria-labelledby="hero-title" className="mx-auto max-w-[1200px] px-4 pt-16 pb-16 sm:px-6 sm:pt-[88px]">
        <div className="flex flex-wrap items-end gap-12">
          <div className="min-w-0 flex-[999_1_640px]">
            <Eyebrow className="pop tracking-[0.06em]">Software developer · Automation · Integrations</Eyebrow>
            <h1
              id="hero-title"
              className="pop mt-5 font-serif text-[clamp(56px,8.2vw,128px)] leading-[0.94] tracking-[-0.02em] [animation-delay:.08s]"
            >
              Quietly taking{" "}
              <em className="draw-underline text-accent">hours</em> out of the working week.
            </h1>
            <p className="pop mt-7 max-w-[600px] text-xl leading-normal text-soft [animation-delay:.16s]">
              I&apos;m {site.firstName}. Since 2024 I&apos;ve built internal business apps, workflow automation and
              integrations for an accounting firm and a multi-business group.
            </p>
            <div className="pop mt-8 flex flex-wrap gap-3 [animation-delay:.24s]">
              <ButtonLink href="/projects/" className="min-h-[52px] text-[17px]">
                See the work
                <Icon name="arrowRight" size={16} strokeWidth={2.5} />
              </ButtonLink>
              <ButtonLink href="/playground/" prefetch={false} variant="glass" className="min-h-[52px] text-[17px]">
                <Icon name="play" size={15} />
                Run a workflow
              </ButtonLink>
            </div>
          </div>
          <aside
            aria-label="Highlight"
            className="glass pop flex max-w-[400px] flex-[1_1_320px] items-center gap-3 rounded-[22px] p-4 [animation-delay:.4s]"
          >
            <span aria-hidden="true" className="flex size-[42px] shrink-0 items-center justify-center rounded-[11px] bg-accent text-accent-fg">
              <Icon name="bolt" size={22} strokeWidth={2.2} />
            </span>
            <span className="min-w-0">
              <span className="block font-mono text-[11px] tracking-[0.04em] text-muted">AUTOMATION · WEEKLY</span>
              <span className="mt-0.5 block font-semibold">Weekly billing run</span>
              <span className="block text-sm text-soft">200–400 invoices · several hours → ≤ 30 min</span>
            </span>
          </aside>
        </div>
      </section>

      {/* Illustration: documents moving along a line of stations */}
      <section aria-label="How work flows through the systems I build (illustration)" className="mx-auto max-w-[1200px] px-4 pb-6 sm:px-6">
        <div className="glass overflow-hidden rounded-[30px]">
          <div className="flex flex-wrap justify-between gap-2 border-b border-border px-5 py-3.5 font-mono text-xs text-muted">
            <span>LINE 01 — read · check · route · sync</span>
            <span>illustration</span>
          </div>
          <div className="relative h-[180px] overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-1/2 -mt-[21px] h-[42px] border-y border-white/12 bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.07)_0_18px,rgb(255_255_255/0.03)_18px_36px)]"
            />
            <ol className="absolute inset-0 grid grid-cols-4 font-mono">
              {stations.map((st) => (
                <li
                  key={st.name}
                  className="flex flex-col items-center justify-between border-r border-dashed border-white/14 px-1.5 py-3.5 text-center last:border-r-0"
                >
                  <span className="flex items-center gap-2 text-xs">
                    <span aria-hidden="true" className="size-[9px] rounded-full bg-accent" />
                    {st.name}
                  </span>
                  <span className="text-[11px] text-muted">{st.tool}</span>
                </li>
              ))}
            </ol>
            {beltItems.map((it) => (
              <span
                key={it.label}
                aria-hidden="true"
                style={{ animationDelay: it.delay }}
                className="belt-item loop -mt-4 inline-flex h-8 items-center rounded-[10px] bg-white/95 px-3 font-mono text-xs font-bold text-accent-fg"
              >
                {it.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section aria-label="Highlights" className="mx-auto flex max-w-[1200px] flex-wrap gap-5 px-4 pb-28 sm:px-6">
        <figure className="glass m-0 flex flex-[2_1_460px] flex-col justify-between gap-5 rounded-[30px] p-6 sm:p-8">
          <p className="font-mono text-xs tracking-[0.04em] text-muted">RUN-TIME / WEEKLY BILLING</p>
          <p className="font-serif text-[clamp(40px,4.2vw,58px)] leading-[1.02] italic">
            From several hours to <span className="text-accent">thirty minutes</span> or less.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[18px] border border-border bg-surface-2 px-[18px] py-4">
              <p className="font-mono text-[11px] text-muted">BEFORE</p>
              <p className="mt-1.5 text-lg font-semibold text-soft sm:text-[22px]">Several hours</p>
            </div>
            <div className="rounded-[18px] border border-[rgb(255_210_63/0.4)] bg-accent-soft px-[18px] py-4">
              <p className="font-mono text-[11px] text-accent">AFTER</p>
              <p className="mt-1.5 text-lg font-semibold sm:text-[22px]">≤ 30 minutes</p>
            </div>
          </div>
          <figcaption className="text-sm text-muted">
            Weekly billing run at an accounting firm · {billing.technologies.join(", ")}
          </figcaption>
        </figure>

        <div className="glass flex-[1.3_1_360px] rounded-[30px] p-7">
          <p className="flex justify-between gap-2 text-[15px] font-semibold">
            <span className="text-ok">Playground workflow</span>
            <span className="font-mono text-xs font-normal text-muted">simulated</span>
          </p>
          <h2 className="mt-1.5 font-serif text-[30px] leading-[1.1]">Expense approval</h2>
          <ol className="mt-4 flex flex-col gap-3">
            {demoSteps.map(([label, type], i) => (
              <li key={label} className="flex items-center gap-3 text-[15px]">
                <span
                  aria-hidden="true"
                  style={{ animationDelay: `${i * 0.5}s` }}
                  className="check-cycle loop flex size-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-[rgb(235_235_245/0.35)]"
                >
                  <Icon name="check" size={12} strokeWidth={3.5} />
                </span>
                <span className="flex-1">{label}</span>
                <span className="font-mono text-[11px] text-muted">{type}</span>
              </li>
            ))}
          </ol>
        </div>

        {readouts.map((r) => (
          <div key={r.code} className="glass flex min-h-44 flex-[1_1_240px] flex-col rounded-[30px] p-6">
            <p className="font-mono text-[11px] tracking-[0.04em] text-muted">{r.code}</p>
            <p className="mt-auto font-serif text-[62px] leading-none text-accent">{r.value}</p>
            <p className="mt-2 text-[15px] leading-snug text-soft">{r.label}</p>
          </div>
        ))}
      </section>

      {/* Selected work */}
      <section aria-labelledby="work-title" className="mx-auto max-w-[1200px] px-4 pb-28 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <Eyebrow>Selected work</Eyebrow>
            <h2 id="work-title" className="mt-2.5 font-serif text-[clamp(44px,5vw,72px)] leading-none">
              Shipped for real businesses
            </h2>
          </div>
          <Link href="/projects/" className="inline-flex min-h-11 items-center gap-2 font-semibold text-accent">
            All projects
            <Icon name="chevronRight" size={14} strokeWidth={3} />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-5">
          <Link
            href={`/projects/${billing.slug}/`}
            className="glass lift col-span-full flex flex-wrap items-end justify-between gap-8 rounded-[30px] p-6 sm:p-9"
          >
            <span className="min-w-0 flex-[999_1_520px]">
              <span className="block font-mono text-xs tracking-[0.06em] text-accent">COVER STORY · AUTOMATION · 2024–25</span>
              <span className="mt-3 block font-serif text-[clamp(36px,4vw,56px)] leading-[1.02]">{billing.headline}</span>
              <span className="mt-3.5 block max-w-[620px] text-[17px] leading-relaxed text-soft">
                Around 200–400 invoices prepared from CSV every week at an accounting firm. As its sole automation
                developer, I automated the run end to end.
              </span>
            </span>
            <span className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-white/14 px-[22px] font-semibold">
              Read the case study
              <Icon name="chevronRight" size={14} strokeWidth={3} />
            </span>
          </Link>
          {workCards.map(({ slug, icon, tint }) => {
            const p = getProject(slug)!;
            return (
              <Link key={slug} href={`/projects/${slug}/`} className="glass lift flex min-h-[230px] flex-col gap-3 rounded-[26px] p-[26px]">
                <span className="flex items-center justify-between gap-3">
                  <span aria-hidden="true" style={{ background: tint }} className="flex size-11 items-center justify-center rounded-xl text-white">
                    <Icon name={icon} size={22} />
                  </span>
                  <span className="font-mono text-[11px] text-muted">{byline(p)}</span>
                </span>
                <span className="text-[21px] font-semibold tracking-[-0.01em]">{p.name}</span>
                <span className="text-[15px] leading-relaxed text-soft">{p.summary}</span>
                <span className="mt-auto font-mono text-xs text-muted">{p.technologies.slice(0, 4).join(" · ")}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Approach */}
      <section aria-labelledby="approach-title" className="mx-auto max-w-[1200px] px-4 pb-28 sm:px-6">
        <Eyebrow>How I work</Eyebrow>
        <h2 id="approach-title" className="mt-2.5 max-w-[760px] font-serif text-[clamp(40px,4.6vw,64px)] leading-none">
          From the problem to software that keeps working
        </h2>
        <ol className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
          {approach.map(([title, body], i) => (
            <li key={title} className="relative border-t-2 border-white/14 pt-[22px]">
              <span aria-hidden="true" className="absolute -top-[7px] left-0 size-3 rounded-full border-2 border-accent bg-bg" />
              <span className="block font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
              <span className="mt-2 block text-lg font-semibold">{title}</span>
              <span className="mt-1.5 block text-sm leading-relaxed text-soft">{body}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Playground */}
      <section aria-labelledby="pg-title" className="mx-auto max-w-[1200px] px-4 pb-28 sm:px-6">
        <div className="glass overflow-hidden rounded-[34px]">
          <div className="px-6 pt-8 pb-2 sm:px-11 sm:pt-11">
            <p className="font-mono text-xs tracking-[0.06em] text-muted">PERSONAL PROJECT · IN PROGRESS</p>
            <h2 id="pg-title" className="mt-3 font-serif text-[clamp(40px,5vw,68px)] leading-none">
              Don&apos;t read about it. <Em>Run it.</Em>
            </h2>
          </div>
          <div className="flex flex-wrap">
            <div className="min-w-0 flex-[999_1_440px] px-6 pt-4 pb-8 sm:px-11 sm:pb-11">
              <p className="max-w-[520px] text-lg leading-normal text-soft">
                Three business workflows execute step by step in your browser: expense approval, email routing and
                invoice extraction. Drop in your own PDF or email; it never leaves your device.
              </p>
              <ButtonLink href="/playground/" prefetch={false} className="mt-7">
                Open the playground
              </ButtonLink>
            </div>
            <div
              role="img"
              aria-label="Sample run log of the invoice extraction workflow"
              className="min-w-0 flex-[1_1_400px] border-l border-border bg-black/45 p-7 font-mono text-[13px] leading-loose"
            >
              <p className="mb-1.5 text-muted">$ run invoice-extraction --sample</p>
              {sampleLog.map(([n, text]) => (
                <p key={n} className="flex gap-4">
                  <span className="text-muted">{n}</span>
                  <span className="flex-1 whitespace-pre">{text}</span>
                  <span className="text-accent">ok</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section aria-labelledby="cta-title" className="mx-auto max-w-[1200px] px-4 pb-24 text-center sm:px-6">
        <h2 id="cta-title" className="mx-auto max-w-[900px] font-serif text-[clamp(48px,6.6vw,104px)] leading-[0.96]">
          Got a process stuck in <Em>spreadsheets?</Em>
        </h2>
        <p className="mx-auto mt-5 max-w-[520px] text-lg leading-normal text-soft">
          Tell me how it works today. I&apos;ll tell you how I&apos;d approach it.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/contact/" className="min-h-[52px] text-[17px]">
            Get in touch
          </ButtonLink>
          <ButtonLink href="/about/" variant="glass" className="min-h-[52px] text-[17px]">
            More about me
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
