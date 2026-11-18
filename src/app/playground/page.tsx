import type { Metadata } from "next";
import Link from "next/link";
import { Container, Eyebrow } from "@/components/ui";
import { Playground } from "@/features/playground/ui/playground";

export const metadata: Metadata = {
  title: "Automation playground",
  description: "Run and inspect example business workflows step by step. Simulated in your browser.",
};

export default function PlaygroundPage() {
  return (
    <Container wide className="pt-16 sm:pt-24">
      <Eyebrow>Playground</Eyebrow>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Automation playground</h1>
      <p className="mt-4 max-w-2xl text-muted text-pretty">
        Pick a sample, run the workflow and watch each step execute. Select any step to see exactly what it received and
        produced. Edit the input to try your own cases.
      </p>
      <p className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-full border border-border px-3 py-1.5 font-mono text-xs text-muted">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
        Simulation: runs entirely in your browser. No real accounting or approval systems are contacted.
      </p>

      <Playground />

      <p className="mt-6 max-w-2xl text-sm text-muted text-pretty">
        Recreated from{" "}
        <Link href="/projects/glide-apps-xero-integration/" className="text-fg underline-offset-4 hover:underline">
          professional work on a Glide–Xero approval flow
        </Link>{" "}
        with synthetic data. How it works:{" "}
        <Link href="/projects/automation-playground/" className="text-fg underline-offset-4 hover:underline">
          case study
        </Link>
        .
      </p>
    </Container>
  );
}
