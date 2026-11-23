import type { CSSProperties } from "react";
import type { HeroRun } from "@/features/playground/hero-run";
import { Icon } from "./icons";

/**
 * The home hero's product view: a real run of the playground's invoice workflow (computed at build time).
 * Steps tick in order, then the fields appear and the total is marked. Phones show the fields only.
 */
export function HeroRunCard({ run, className = "", style }: { run: HeroRun; className?: string; style?: CSSProperties }) {
  const ran = run.steps.filter((s) => s.status === "success").length;
  const skipped = run.steps.filter((s) => s.status === "skipped");

  return (
    <figure aria-labelledby="run-title" className={`m-0 min-w-0 ${className}`} style={style}>
      <div className="panel overflow-hidden rounded-card">
        <div className="flex h-12 items-center justify-between gap-4 border-b border-border px-5">
          <p id="run-title" className="flex min-w-0 items-baseline gap-3">
            <span className="shrink-0 text-sm font-medium">{run.workflow}</span>
            <span className="truncate font-mono text-xs text-muted">{run.fileName}</span>
          </p>
          <span className="shrink-0 font-mono text-xs text-muted">sample run</span>
        </div>

        <div className="grid md:grid-cols-[240px_minmax(0,1fr)]">
          <ol aria-label="Steps" className="border-border px-5 py-4 max-md:hidden md:border-r">
            {run.steps.map((s, i) => (
              <li key={s.id} className="flex h-8 items-center gap-3 text-sm">
                {s.status === "success" ? (
                  <span
                    className="run-step flex size-4 shrink-0 items-center justify-center rounded-full bg-ok-soft text-ok"
                    style={{ "--i": i } as CSSProperties}
                  >
                    <Icon name="check" size={10} strokeWidth={3} />
                  </span>
                ) : (
                  <span className="size-4 shrink-0 rounded-full border border-dashed border-border-strong" />
                )}
                <span className={`min-w-0 truncate ${s.status === "skipped" ? "text-muted" : "text-soft"}`}>{s.label}</span>
                {s.simulated && <span className="ml-auto font-mono text-xs text-muted">simulated</span>}
                <span className="sr-only">{s.status === "skipped" ? ", skipped" : ", done"}</span>
              </li>
            ))}
          </ol>

          <div className="px-5 py-4">
            <p aria-hidden="true" className="flex h-8 items-center justify-between font-mono text-xs text-muted">
              <span>Extracted field</span>
              <span>Confidence</span>
            </p>
            <dl>
            {run.fields.map((f, i) => {
              const key = i === run.keyField;
              return (
                <div
                  key={f.label}
                  className={`run-field grid grid-cols-[88px_minmax(0,1fr)_32px] items-center gap-3 border-t border-border py-2 ${key ? "min-h-12" : "min-h-9"}`}
                  style={{ "--i": i } as CSSProperties}
                >
                  <dt className="text-sm text-muted">{f.label}</dt>
                  <dd className={`min-w-0 text-right text-balance tabular-nums ${key ? "text-xl" : "text-sm"}`}>
                    {key ? <span className="hl hl-draw">{f.value}</span> : f.value}
                  </dd>
                  <dd className="text-right font-mono text-xs text-muted tabular-nums">
                    <span className="sr-only">confidence </span>
                    {f.confidence.toFixed(2)}
                  </dd>
                </div>
              );
            })}
            </dl>
          </div>
        </div>

        <div className="flex h-12 items-center justify-between gap-4 border-t border-border px-5 text-sm">
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="size-2 rounded-full bg-ok" />
            {run.status}
          </span>
          <span className="font-mono text-xs text-muted">
            {ran} of {run.steps.length} steps{skipped.length > 0 && <span className="max-sm:hidden"> · review skipped</span>}
          </span>
        </div>
      </div>
      <figcaption className="mt-3 text-sm leading-relaxed text-muted">
        Real output from the playground&apos;s invoice workflow on a synthetic sample. For samples, text extraction is
        simulated.
      </figcaption>
    </figure>
  );
}
