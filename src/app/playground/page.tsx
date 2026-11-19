import type { Metadata } from "next";
import { pageMetadata } from "@/app/shared-metadata";
import Link from "next/link";
import { Container, Eyebrow } from "@/components/ui";
import { Playground } from "@/features/playground/ui/playground";

export const metadata: Metadata = pageMetadata("/playground/", {
  title: "Automation playground",
  description: "Run and inspect example business workflows step by step, in your browser. Integrations are simulated.",
});

const how = [
  [
    "A typed engine",
    "Workflows are data, checked with a Zod schema and a graph validator before they run. The runner is async, never throws, gives each step a timeout, and can pause at a review step until a person decides.",
  ],
  [
    "Honest adapters",
    "Every integration step is either a labelled simulation (approval, accounting, helpdesk) or real work done on your device (reading a document). A real integration would sit behind the same interface on a server.",
  ],
  [
    "Private by design",
    "Files are read in your browser with PDF.js and Tesseract.js, served from this site. A Content-Security-Policy stops the page from sending data anywhere else.",
  ],
];

const link = "text-fg underline decoration-muted underline-offset-4 transition hover:decoration-accent";

export default function PlaygroundPage() {
  return (
    <Container wide className="pt-14 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
        <div>
          <Eyebrow>Personal project · Live</Eyebrow>
          <h1 className="mt-3 font-serif text-display-2 leading-[0.95]">
            Automation Playground
          </h1>
          <p className="mt-[18px] max-w-[640px] text-[19px] leading-normal text-soft">
            Pick a workflow and a sample, press Run, and watch every step execute. Select a step to see what it received
            and produced. Everything runs in your browser; approval, accounting and helpdesk steps are simulated and
            labelled.
          </p>
        </div>
        <ul className="flex flex-wrap gap-2 font-mono text-xs">
          <li className="rounded-full border border-border-strong px-3 py-2">no account</li>
          <li className="rounded-full border border-border-strong px-3 py-2">no uploads</li>
          <li className="rounded-full border border-accent-line px-3 py-2 text-accent">simulated integrations</li>
        </ul>
      </div>

      <Playground />

      <section aria-labelledby="how-title" className="mt-[72px]">
        <h2 id="how-title" className="font-serif text-display-3 leading-none">
          How it&apos;s built
        </h2>
        <div className="mt-7 grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-5">
          {how.map(([title, body], i) => (
            <div key={title} className="glass rounded-card p-[26px]">
              <p className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-2.5 text-xl font-semibold">{title}</h3>
              <p className="mt-2.5 text-[15px] leading-relaxed text-soft">{body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted text-pretty">
          Expense approval is recreated from{" "}
          <Link href="/projects/glide-apps-xero-integration/" className={link}>
            professional work on a Glide–Xero approval flow
          </Link>
          , and invoice extraction from{" "}
          <Link href="/projects/document-intake-pipeline/" className={link}>
            OCR document intake work
          </Link>
          . Email routing is illustrative. All data is synthetic. More detail in the{" "}
          <Link href="/projects/automation-playground/" className={link}>
            case study
          </Link>
          .
        </p>
      </section>
    </Container>
  );
}
