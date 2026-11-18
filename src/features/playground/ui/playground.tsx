"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import { runWorkflow, type AdapterRegistry, type Data, type RunResult } from "../engine";
import { toCsv } from "../intake/csv";
import { checkFile, formatBytes } from "../intake/limits";
import { workflows, type PlaygroundWorkflow } from "../workflows";
import { canvasHeight, layoutWorkflow } from "./layout";
import { eventDelay, replayFrame, type UiStatus } from "./replay";
import { statusGlyph, typeLabel } from "./step-node";

// React Flow measures the DOM, so it renders on the client only. The placeholder keeps the height stable.
const FlowGraph = dynamic(() => import("./flow-graph"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center font-mono text-xs text-muted">Loading graph…</div>,
});

type Tab = "input" | "step" | "log";
const tabs: { id: Tab; label: string }[] = [
  { id: "input", label: "Input" },
  { id: "step", label: "Steps" },
  { id: "log", label: "Log" },
];

const pretty = (v: unknown) => JSON.stringify(v, null, 2);

export function Playground() {
  const [workflowIndex, setWorkflowIndex] = useState(0);
  const wf = workflows[workflowIndex];
  const def = wf.definition;

  const [sampleId, setSampleId] = useState(wf.samples[0].id);
  const sample = wf.samples.find((s) => s.id === sampleId) ?? wf.samples[0];
  const [inputText, setInputText] = useState(() => pretty(sample.input));
  const [result, setResult] = useState<RunResult | null>(null);
  const [cursor, setCursor] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("input");
  const runToken = useRef(0);
  // The visitor's own file. Held in memory only; never uploaded or stored.
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<{ message: string; fraction?: number } | null>(null);

  const parsed = useMemo((): { ok: true; data: Data } | { ok: false; error: string } => {
    try {
      const value: unknown = JSON.parse(inputText);
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return { ok: false, error: "Input must be a JSON object: { ... }" };
      }
      return { ok: true, data: value as Data };
    } catch (e) {
      return { ok: false, error: `Invalid JSON: ${(e as Error).message}` };
    }
  }, [inputText]);

  const frame = replayFrame(def, result, cursor);
  const graphHeight = useMemo(() => canvasHeight(layoutWorkflow(def)), [def]);
  const running = processing !== null || (result !== null && !frame.done);
  const badges = useMemo(() => stepBadges(wf, file ? activeAdapters(wf, file, () => {}) : wf.adapters), [wf, file]);
  const simulatedIds = useMemo(
    () => new Set(Object.entries(badges).filter(([, b]) => b === "simulated").map(([id]) => id)),
    [badges],
  );

  // Step the replay cursor through the event log.
  useEffect(() => {
    if (!result || cursor >= result.events.length) return;
    const timer = setTimeout(() => setCursor((c) => c + 1), eventDelay(result.events[cursor]));
    return () => clearTimeout(timer);
  }, [result, cursor]);

  function clearRun() {
    runToken.current++;
    setResult(null);
    setCursor(0);
    setProcessing(null);
  }

  function loadSample(id: string, index = workflowIndex) {
    const s = workflows[index].samples.find((x) => x.id === id) ?? workflows[index].samples[0];
    setSampleId(s.id);
    setInputText(pretty(s.input));
    setSelectedId(null);
    setFile(null);
    setFileError(null);
    clearRun();
  }

  async function attachFile(f: File) {
    const upload = wf.upload;
    if (!upload) return;
    const problem = checkFile(f, upload.kinds);
    if (problem) {
      setFileError(problem);
      return;
    }
    try {
      const input = await upload.toInput(f);
      clearRun();
      setFile(f);
      setFileError(null);
      setInputText(pretty(input));
      setSelectedId(null);
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "This file couldn't be read.");
    }
  }

  async function run() {
    if (!parsed.ok) return;
    const token = ++runToken.current;
    setResult(null);
    setCursor(0);
    if (file) setProcessing({ message: "Starting" });
    const onProgress = (message: string, fraction?: number) => {
      if (token === runToken.current) setProcessing({ message, fraction });
    };
    const r = await runWorkflow(def, parsed.data, { adapters: file ? activeAdapters(wf, file, onProgress) : wf.adapters });
    if (token !== runToken.current) return; // reset or re-run happened meanwhile
    setProcessing(null);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setResult(r);
    setCursor(reduceMotion ? r.events.length : 0);
    setTab("log");
  }

  function select(id: string) {
    setSelectedId(id);
    setTab("step");
  }

  const runStatus: { text: string; tone: string } = processing
    ? {
        text: `${processing.message}…${processing.fraction !== undefined ? ` ${Math.round(processing.fraction * 100)}%` : ""}`,
        tone: "text-accent",
      }
    : !result
    ? { text: "Ready", tone: "text-muted" }
    : running
      ? { text: "Running…", tone: "text-accent" }
      : result.status === "success"
        ? { text: "Completed", tone: "text-accent" }
        : result.status === "failed"
          ? { text: "Failed", tone: "text-danger" }
          : { text: "Not run: invalid input", tone: "text-danger" };

  return (
    <div className="mt-10">
      {workflows.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Workflow">
          {workflows.map((w, i) => (
            <button
              key={w.definition.id}
              type="button"
              aria-pressed={i === workflowIndex}
              onClick={() => {
                setWorkflowIndex(i);
                loadSample(w.samples[0].id, i);
                setTab("input");
              }}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                i === workflowIndex ? "border-accent bg-accent-soft text-fg" : "border-border text-muted hover:text-fg"
              }`}
            >
              {w.definition.name}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface">
        {/* Header and controls */}
        <div className="flex flex-col gap-4 border-b border-border p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <h2 className="text-lg font-semibold tracking-tight">{def.name}</h2>
            <p className="mt-1 text-sm text-muted text-pretty">{def.description}</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-muted">
              Sample input
              <select
                value={file ? "" : sampleId}
                onChange={(e) => loadSample(e.target.value)}
                className="h-10 rounded-lg border border-border bg-bg px-3 text-sm text-fg"
              >
                {file && (
                  <option value="" disabled>
                    Your file
                  </option>
                )}
                {wf.samples.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={run}
              disabled={!parsed.ok || running}
              className="h-10 rounded-full bg-accent px-5 text-sm font-medium text-accent-fg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {result && frame.done ? "Run again" : "Run"}
            </button>
            {running && !processing ? (
              <button
                type="button"
                onClick={() => setCursor(result!.events.length)}
                className="h-10 rounded-full border border-border px-4 text-sm transition hover:bg-surface-2"
              >
                Skip to end
              </button>
            ) : (
              <button
                type="button"
                onClick={() => loadSample(sampleId)}
                title={file ? "Clear your file and the run" : undefined}
                className="h-10 rounded-full border border-border px-4 text-sm transition hover:bg-surface-2"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5 text-xs sm:px-5">
          <p className="text-muted">
            {file ? `Your file: ${file.name} (${formatBytes(file.size)}). Read on this device, never uploaded.` : sample.description}
          </p>
          <p role="status" aria-live="polite" className={`font-mono ${runStatus.tone}`}>
            {runStatus.text}
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px]" style={{ "--canvas-h": `${graphHeight}px` } as CSSProperties}>
          <div className="h-(--canvas-h) border-b border-border lg:border-r lg:border-b-0">
            <FlowGraph key={def.id} definition={def} frame={frame} selectedId={selectedId} badges={badges} onSelect={select} />
          </div>

          <div className="flex max-h-[600px] min-h-[360px] min-w-0 flex-col lg:h-(--canvas-h) lg:max-h-none">
            <TabBar value={tab} onChange={setTab} />
            <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-5" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
              {tab === "input" && (
                <>
                  {wf.upload && (
                    <UploadBox
                      hint={wf.upload.hint}
                      accept={acceptFor(wf)}
                      file={file}
                      error={fileError}
                      disabled={processing !== null}
                      onFile={attachFile}
                      onClear={() => loadSample(sampleId)}
                    />
                  )}
                  <InputPanel
                    text={inputText}
                    error={parsed.ok ? null : parsed.error}
                    readOnly={file !== null}
                    onChange={(t) => {
                      setInputText(t);
                      clearRun();
                    }}
                  />
                </>
              )}
              {tab === "step" && (
                <StepPanel
                  wf={wf}
                  result={result}
                  statuses={frame.statuses}
                  done={frame.done}
                  selectedId={selectedId}
                  simulatedIds={simulatedIds}
                  badges={badges}
                  onSelect={setSelectedId}
                />
              )}
              {tab === "log" && <LogPanel events={frame.events} />}
            </div>
          </div>
        </div>

        {result && frame.done && (
          <ResultPanel result={result} fileStem={def.id} labelOf={(id) => def.nodes.find((n) => n.id === id)?.label ?? id} />
        )}
      </div>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────

function TabBar({ value, onChange }: { value: Tab; onChange: (t: Tab) => void }) {
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
          className={`-mb-px border-b-2 px-3 py-2.5 text-sm transition ${
            value === t.id ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Panels ────────────────────────────────────────────────────────────────

function InputPanel({
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
        className={`mt-2 w-full resize-y rounded-lg border bg-bg p-3 font-mono text-xs leading-relaxed text-fg ${
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

function StepPanel({
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
                className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-surface-2"
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
        <h3 className="mt-1 font-semibold">{node.label}</h3>
        {node.description && <p className="mt-1 text-muted text-pretty">{node.description}</p>}
        <div className="mt-2">
          <StatusChip status={statuses[node.id]} />
        </div>
      </div>

      {simulatedIds.has(node.id) && (
        <p className="rounded-md border border-border bg-bg px-3 py-2 text-xs text-muted">
          <span className="text-accent">Simulated.</span> A deterministic mock stands in for the real service. No external
          system is contacted.
        </p>
      )}
      {badges[node.id] === "on device" && (
        <p className="rounded-md border border-border bg-bg px-3 py-2 text-xs text-muted">
          <span className="text-accent">Runs on your device.</span> This step does real work in your browser. Your data is
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

function LogPanel({ events }: { events: RunResult["events"] }) {
  const list = useRef<HTMLOListElement>(null);
  // Keep the newest entry visible by scrolling the panel itself, never the page.
  useEffect(() => {
    const box = list.current?.parentElement;
    if (box) box.scrollTop = box.scrollHeight;
  }, [events.length]);

  if (!events.length) return <p className="text-xs text-muted">Run the workflow to see the execution log.</p>;
  const tone = { info: "text-muted", success: "text-accent", error: "text-danger", skip: "text-muted opacity-70" };
  return (
    <ol ref={list} className="space-y-1.5 font-mono text-xs">
      {events.map((e) => (
        <li key={e.seq} className={`flex gap-3 ${tone[e.level]}`}>
          <span className="w-6 shrink-0 text-right opacity-60">{e.seq + 1}</span>
          <span className="text-pretty">{e.message}</span>
        </li>
      ))}
    </ol>
  );
}

function ResultPanel({ result, fileStem, labelOf }: { result: RunResult; fileStem: string; labelOf: (id: string) => string }) {
  const failedAt = result.status === "failed" ? result.order.find((id) => result.nodes[id].status === "error") : undefined;
  return (
    <div className="border-t border-border p-4 sm:p-5">
      <p className="font-mono text-xs text-muted uppercase">Final result</p>
      {result.status === "success" && <p className="mt-2 text-sm">The workflow completed.</p>}
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
            <button type="button" onClick={() => download(`${fileStem}-result.json`, `${pretty(result.output)}\n`, "application/json")} className="rounded-full border border-border px-4 py-1.5 transition hover:bg-surface-2">
              Download JSON
            </button>
            <button type="button" onClick={() => download(`${fileStem}-result.csv`, toCsv(result.output!), "text/csv")} className="rounded-full border border-border px-4 py-1.5 transition hover:bg-surface-2">
              Download CSV
            </button>
            <span className="text-xs text-muted">Generated in your browser.</span>
          </div>
        </>
      )}
    </div>
  );
}

function UploadBox({
  hint,
  accept,
  file,
  error,
  disabled,
  onFile,
  onClear,
}: {
  hint: string;
  accept: string;
  file: File | null;
  error: string | null;
  disabled: boolean;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  const [over, setOver] = useState(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files[0];
    if (f && !disabled) onFile(f);
  };
  return (
    <div className="mb-5">
      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-accent/60 bg-accent-soft px-3 py-2.5 text-sm">
          <span className="min-w-0 truncate">
            {file.name} <span className="text-muted">· {formatBytes(file.size)}</span>
          </span>
          <button type="button" onClick={onClear} disabled={disabled} className="shrink-0 text-xs text-muted transition hover:text-fg disabled:opacity-40">
            Remove file
          </button>
        </div>
      ) : (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          className={`block cursor-pointer rounded-lg border border-dashed px-4 py-4 text-center text-sm transition focus-within:ring-2 focus-within:ring-accent ${
            over ? "border-accent bg-accent-soft" : "border-border hover:border-muted"
          }`}
        >
          <span className="font-medium">Use your own file</span>
          <span className="mt-1 block text-xs text-muted">Drop it here or choose a file. {hint}</span>
          <input
            type="file"
            accept={accept}
            className="sr-only"
            disabled={disabled}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) onFile(f);
            }}
          />
        </label>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
      <p className="mt-2 text-xs text-muted">
        Read in this browser and never uploaded. Nothing is saved: it&apos;s gone when you reset or leave the page.
      </p>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

function activeAdapters(wf: PlaygroundWorkflow, file: File, onProgress: (m: string, f?: number) => void): AdapterRegistry {
  return wf.upload?.adapters ? wf.upload.adapters(file, onProgress) : wf.adapters;
}

/** How each integration step runs with the given adapters: simulated, or real work on the device. */
function stepBadges(wf: PlaygroundWorkflow, adapters: AdapterRegistry): Record<string, string> {
  const out: Record<string, string> = {};
  for (const n of wf.definition.nodes) {
    if (n.type !== "integration") continue;
    const a = adapters[n.config.adapter];
    if (a?.simulated) out[n.id] = "simulated";
    else if (a?.runsLocally) out[n.id] = "on device";
  }
  return out;
}

const acceptByKind = { pdf: ".pdf,application/pdf", image: ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp", text: ".txt,text/plain", email: ".eml,message/rfc822" };
const acceptFor = (wf: PlaygroundWorkflow) => (wf.upload?.kinds ?? []).map((k) => acceptByKind[k]).join(",");

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// ── Small pieces ──────────────────────────────────────────────────────────

const chipTone: Record<UiStatus, string> = {
  idle: "text-muted",
  running: "text-accent",
  success: "text-accent",
  error: "text-danger",
  skipped: "text-muted opacity-70",
};
const chipText: Record<UiStatus, string> = { idle: "Not run", running: "Running", success: "Done", error: "Failed", skipped: "Skipped" };

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
    <pre className="max-h-72 overflow-auto rounded-md border border-border bg-bg p-3 font-mono text-xs leading-relaxed">
      {pretty(value)}
    </pre>
  );
}
