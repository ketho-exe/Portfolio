"use client";

import type { KeyboardEvent, ReactNode } from "react";
import type { RunResult } from "../engine";
import { toCsv } from "../intake/csv";
import type { workflows } from "../workflows";
import type { UiStatus } from "./replay";
import { statusGlyph, typeLabel } from "./step-node";

/** Inspector panels and the tab strip beside the graph. */

export type Tab = "input" | "step" | "log" | "review";

export const pretty = (v: unknown) => JSON.stringify(v, null, 2);

export function TabBar({ items: tabs, value, onChange }: { items: { id: Tab; label: string }[]; value: Tab; onChange: (t: Tab) => void }) {
  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = tabs.findIndex((t) => t.id === value);
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    onChange(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  }
  return (
    <div role="tablist" aria-label="Panels" className="flex border-b border-border px-2" onKeyDown={onKeyDown}>
      {tabs.map((t) => (
        <button
          key={t.id}
          id={`tab-${t.id}`}
          role="tab"
          type="button"
          aria-selected={value === t.id}
          aria-controls={`panel-${t.id}`}
          tabIndex={value === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          className={`-mb-px min-h-11 cursor-pointer border-b-2 px-3 text-sm font-medium transition ${
            value === t.id ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"
          }`}
        >
          {t.label}
          {t.id === "review" && <span aria-hidden="true" className="ml-1.5 inline-block size-1.5 rounded-full bg-accent align-middle" />}
        </button>
      ))}
    </div>
  );
}

export function InputPanel({
  text,
  error,
  readOnly,
  onChange,
}: {
  text: string;
  error: string | null;
  readOnly: boolean;
  onChange: (t: string) => void;
}) {
  return (
    <div>
      <label htmlFor="workflow-input" className="text-xs text-muted">
        {readOnly
          ? "Built from your file. Remove the file to edit the JSON again."
          : "Edit the JSON and press Run. Changing it clears the last run."}
      </label>
      <textarea
        id="workflow-input"
        value={text}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        aria-invalid={error !== null}
        aria-describedby={error ? "workflow-input-error" : undefined}
        rows={16}
        className={`mt-2 w-full resize-y rounded-chip border bg-code p-3.5 font-mono text-[13px] leading-[1.7] text-fg ${
          error ? "border-danger" : "border-border"
        }`}
      />
      {error && (
        <p id="workflow-input-error" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function StepPanel({
  wf,
  result,
  statuses,
  done,
  selectedId,
  simulatedIds,
  badges,
  onSelect,
}: {
  wf: (typeof workflows)[number];
  result: RunResult | null;
  statuses: Record<string, UiStatus>;
  done: boolean;
  selectedId: string | null;
  simulatedIds: Set<string>;
  badges: Record<string, string>;
  onSelect: (id: string | null) => void;
}) {
  const node = wf.definition.nodes.find((n) => n.id === selectedId);

  if (!node) {
    return (
      <div>
        <p className="text-xs text-muted">Select a step to inspect it, here or in the graph.</p>
        <ol className="mt-3 space-y-1">
          {wf.definition.nodes.map((n, i) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => onSelect(n.id)}
                className="flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-chip px-2 text-left text-sm transition hover:bg-surface-2"
              >
                <span className="w-5 font-mono text-xs text-muted">{i + 1}</span>
                <span className="flex-1 truncate">{n.label}</span>
                <StatusChip status={statuses[n.id]} />
              </button>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const record = done ? result?.nodes[node.id] : undefined;
  return (
    <div className="space-y-5 text-sm">
      <button type="button" onClick={() => onSelect(null)} className="text-xs text-muted transition hover:text-fg">
        ← All steps
      </button>
      <div>
        <p className="font-mono text-[10px] text-muted uppercase">{typeLabel[node.type]}</p>
        <h3 className="mt-1 font-medium">{node.label}</h3>
        {node.description && <p className="mt-1 text-muted text-pretty">{node.description}</p>}
        <div className="mt-2">
          <StatusChip status={statuses[node.id]} />
        </div>
      </div>

      {simulatedIds.has(node.id) && (
        <p className="rounded-chip border border-border bg-code px-3 py-2 text-xs text-soft">
          <span className="text-accent">Simulated.</span> A deterministic mock stands in for the real service. No external
          system is contacted.
        </p>
      )}
      {badges[node.id] === "you" && (
        <p className="rounded-chip border border-border bg-code px-3 py-2 text-xs text-soft">
          <span className="text-accent">Your step.</span> The run really pauses here until you confirm or reject. Nothing
          is sent anywhere.
        </p>
      )}
      {badges[node.id] === "on device" && (
        <p className="rounded-chip border border-border bg-code px-3 py-2 text-xs text-soft">
          <span className="text-ok">Runs on your device.</span> This step does real work in your browser. Your data is
          not uploaded anywhere.
        </p>
      )}

      {!record ? (
        <p className="text-xs text-muted">{result ? "Waiting for this step…" : "Run the workflow to see this step's input and output."}</p>
      ) : (
        <>
          {record.note && <Field label={record.status === "skipped" ? "Why skipped" : "Result"}>{record.note}</Field>}
          {record.error && (
            <Field label="Error">
              <span className="text-danger">{record.error}</span>
              {record.details && (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-danger">
                  {record.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              )}
            </Field>
          )}
          {record.input && <Field label="Input"><Json value={record.input} /></Field>}
          {record.output && <Field label="Output"><Json value={record.output} /></Field>}
        </>
      )}
    </div>
  );
}

export function ResultPanel({
  result,
  fileStem,
  labelOf,
  onOpenReview,
}: {
  result: RunResult;
  fileStem: string;
  labelOf: (id: string) => string;
  onOpenReview: () => void;
}) {
  if (result.status === "waiting") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 sm:p-5">
        <p className="text-sm">
          <span className="font-medium text-accent">Paused at “{labelOf(result.waitingAt!)}”.</span> Check the fields in
          the Review tab, then confirm or reject.
        </p>
        <button
          type="button"
          onClick={onOpenReview}
          className="min-h-11 cursor-pointer rounded-control border border-border-strong px-4 text-sm font-medium transition hover:bg-surface-2"
        >
          Open review
        </button>
      </div>
    );
  }
  const failedAt = result.status === "failed" ? result.order.find((id) => result.nodes[id].status === "error") : undefined;
  return (
    <div className="border-t border-border p-4 sm:p-5">
      <p className="font-mono text-xs tracking-[0.08em] text-muted uppercase">Final result</p>
      {result.status === "success" && <p className="mt-2 font-medium text-ok">The workflow completed.</p>}
      {failedAt && (
        <p className="mt-2 text-sm">
          <span className="text-danger">Stopped at “{labelOf(failedAt)}”:</span> {result.error}
        </p>
      )}
      {failedAt && result.nodes[failedAt].details?.length ? (
        <ul className="mt-1 list-disc pl-5 text-sm text-muted">
          {result.nodes[failedAt].details!.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      ) : null}
      {result.status === "invalid" && (
        <div className="mt-2 text-sm">
          <p className="text-danger">The run did not start:</p>
          <ul className="mt-1 list-disc pl-5 text-muted">
            {result.issues?.map((i) => <li key={i}>{i}</li>)}
          </ul>
        </div>
      )}
      {result.output && (
        <>
          <div className="mt-3">
            <Json value={result.output} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <button type="button" onClick={() => download(`${fileStem}-result.json`, `${pretty(result.output)}\n`, "application/json")} className="min-h-11 cursor-pointer rounded-control border border-border-strong px-4 font-medium transition hover:bg-surface-2">
              Download JSON
            </button>
            <button type="button" onClick={() => download(`${fileStem}-result.csv`, toCsv(result.output!), "text/csv")} className="min-h-11 cursor-pointer rounded-control border border-border-strong px-4 font-medium transition hover:bg-surface-2">
              Download CSV
            </button>
            <span className="text-xs text-muted">Generated in your browser.</span>
          </div>
        </>
      )}
    </div>
  );
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

const chipTone: Record<UiStatus, string> = {
  idle: "text-muted",
  running: "text-accent",
  success: "text-ok",
  error: "text-danger",
  skipped: "text-muted",
  waiting: "text-accent",
};
const chipText: Record<UiStatus, string> = {
  idle: "Not run",
  running: "Running",
  success: "Done",
  error: "Failed",
  skipped: "Skipped",
  waiting: "Waiting for you",
};

function StatusChip({ status }: { status: UiStatus }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 font-mono text-xs ${chipTone[status]}`}>
      <span aria-hidden="true">{statusGlyph[status]}</span>
      {chipText[status]}
    </span>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] text-muted uppercase">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Json({ value }: { value: unknown }) {
  return (
    <pre className="max-h-72 overflow-auto rounded-chip border border-border bg-code p-3.5 font-mono text-xs leading-relaxed">
      {pretty(value)}
    </pre>
  );
}
