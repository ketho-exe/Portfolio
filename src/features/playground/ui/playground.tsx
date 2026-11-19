"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import { resumeWorkflow, runWorkflow, validateWorkflow, type AdapterRegistry, type Data, type ReviewDecision, type RunResult } from "../engine";
import { toCsv } from "../intake/csv";
import { checkFile, documentKind, formatBytes, type DocumentKind } from "../intake/limits";
import { workflows, type PlaygroundWorkflow } from "../workflows";
import { canvasHeight, layoutWorkflow } from "./layout";
import { eventDelay, replayFrame, type UiStatus } from "./replay";
import { ReviewPanel } from "./review-panel";
import { statusGlyph, typeLabel } from "./step-node";

// React Flow measures the DOM, so it renders on the client only. The placeholder keeps the height stable.
const FlowGraph = dynamic(() => import("./flow-graph"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center font-mono text-xs text-muted">Loading graph…</div>,
});

type Tab = "input" | "step" | "log" | "review";
const baseTabs: { id: Tab; label: string }[] = [
  { id: "input", label: "Input" },
  { id: "step", label: "Steps" },
  { id: "log", label: "Log" },
];
// Shown only while a run is paused for the visitor's review.
const reviewTabs: { id: Tab; label: string }[] = [...baseTabs, { id: "review", label: "Review" }];

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
  const runner = useRef<HTMLElement>(null);
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

  const awaitingReview = result?.status === "waiting" && frame.done;
  const reviewNode = useMemo(() => {
    if (!result?.waitingAt) return undefined;
    const v = validateWorkflow(def);
    const n = v.ok ? v.workflow.nodes.find((x) => x.id === result.waitingAt) : undefined;
    return n?.type === "review" ? n : undefined;
  }, [def, result]);
  const tabs = awaitingReview ? reviewTabs : baseTabs;
  const shownTab = tab === "review" && !awaitingReview ? "log" : tab;

  // Step the replay cursor through the event log. A run paused for review opens the Review tab when the replay reaches it.
  useEffect(() => {
    if (!result || cursor >= result.events.length) return;
    const timer = setTimeout(() => {
      setCursor((c) => c + 1);
      if (cursor + 1 === result.events.length && result.status === "waiting") setTab("review");
    }, eventDelay(result.events[cursor]));
    return () => clearTimeout(timer);
  }, [result, cursor]);

  function skipToEnd(r: RunResult) {
    setCursor(r.events.length);
    setTab(r.status === "waiting" ? "review" : "log");
  }

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

  function pickWorkflow(index: number) {
    setWorkflowIndex(index);
    loadSample(workflows[index].samples[0].id, index);
    setTab("input");
  }

  /** Checks the file, then hands it to the workflow that can read it (switching workflow if needed). */
  async function attachFile(f: File) {
    const problem = checkFile(f, uploadKinds);
    if (problem) {
      setFileError(problem);
      return;
    }
    const kind = documentKind(f.name)!;
    const target = wf.upload?.kinds.includes(kind) ? workflowIndex : workflows.findIndex((w) => w.upload?.kinds.includes(kind));
    try {
      const input = await workflows[target].upload!.toInput(f);
      if (target !== workflowIndex) {
        setWorkflowIndex(target);
        setSampleId(workflows[target].samples[0].id);
      }
      clearRun();
      setFile(f);
      setFileError(null);
      setInputText(pretty(input));
      setSelectedId(null);
      setTab("input");
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
    setResult(r);
    if (instantReplay()) skipToEnd(r);
    else {
      setCursor(0);
      setTab("log");
    }
  }

  /** The visitor's review decision. The run continues from the pause, and the replay picks up where it stopped. */
  async function decide(decision: ReviewDecision) {
    if (!result || result.status !== "waiting") return;
    const token = runToken.current;
    const r = await resumeWorkflow(def, result, decision, { adapters: file ? activeAdapters(wf, file, () => {}) : wf.adapters });
    if (token !== runToken.current) return;
    setResult(r);
    if (instantReplay()) skipToEnd(r);
    else {
      setCursor(result.events.length);
      setTab("log");
    }
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
      : result.status === "waiting"
        ? { text: "Paused: waiting for your review", tone: "text-accent" }
      : result.status === "success"
        ? { text: "Completed", tone: "text-ok" }
        : result.status === "failed"
          ? { text: "Failed", tone: "text-danger" }
          : { text: "Not run: invalid input", tone: "text-danger" };

  const control = "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-[18px] text-[15px] font-semibold";

  return (
    <>
      <section ref={runner} aria-label="Workflow runner" className="glass mt-9 scroll-mt-24 overflow-hidden rounded-[30px]">
        {/* Workflow picker and run controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3.5 py-3">
          <div role="group" aria-label="Workflow" className="inline-flex flex-wrap gap-1 rounded-full bg-surface-2 p-1">
            {workflows.map((w, i) => (
              <button
                key={w.definition.id}
                type="button"
                aria-pressed={i === workflowIndex}
                onClick={() => pickWorkflow(i)}
                className={`min-h-10 cursor-pointer rounded-full px-4 text-sm transition-colors ${
                  i === workflowIndex ? "bg-accent font-bold text-accent-fg" : "font-semibold text-soft hover:text-fg"
                }`}
              >
                {w.definition.name}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {running && !processing ? (
              // Distinct keys: React must not reuse this button as "Reset", or a late click would clear the run.
              <button key="skip" type="button" onClick={() => skipToEnd(result!)} className={`${control} tap border border-border-strong`}>
                Skip to end
              </button>
            ) : (
              <button
                key="reset"
                type="button"
                onClick={() => loadSample(sampleId)}
                title={file ? "Clear your file and the run" : undefined}
                className={`${control} tap border border-border-strong`}
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={run}
              disabled={!parsed.ok || running}
              className={`${control} tap bg-accent px-[22px] font-bold text-accent-fg disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 4.5v15l13-7.5z" />
              </svg>
              {result && frame.done ? "Run again" : "Run"}
            </button>
          </div>
        </div>

        {/* Workflow description and sample */}
        <div className="flex flex-col gap-4 border-b border-border p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-serif text-3xl leading-tight">{def.name}</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-soft text-pretty">{def.description}</p>
          </div>
          <label className="flex shrink-0 flex-col gap-1.5 font-mono text-[11px] tracking-[0.08em] text-muted uppercase">
            Sample input
            <select
              value={file ? "" : sampleId}
              onChange={(e) => loadSample(e.target.value)}
              className="h-11 min-w-56 cursor-pointer rounded-xl border border-border-strong bg-surface-solid px-3 font-sans text-[15px] tracking-normal text-fg normal-case"
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
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5 text-[13px] sm:px-5">
          <p className="text-soft">
            {file ? `Your file: ${file.name} (${formatBytes(file.size)}). Read on this device, never uploaded.` : sample.description}
          </p>
          <p role="status" aria-live="polite" className={`font-mono text-xs ${runStatus.tone}`}>
            {runStatus.text}
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_400px]" style={{ "--canvas-h": `${graphHeight}px` } as CSSProperties}>
          <div className="canvas-dots h-(--canvas-h) border-b border-border lg:border-r lg:border-b-0">
            <FlowGraph key={def.id} definition={def} frame={frame} selectedId={selectedId} badges={badges} onSelect={select} />
          </div>

          <div className="flex max-h-[600px] min-h-[360px] min-w-0 flex-col lg:h-(--canvas-h) lg:max-h-none">
            <TabBar items={tabs} value={shownTab} onChange={setTab} />
            <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-5" role="tabpanel" id={`panel-${shownTab}`} aria-labelledby={`tab-${shownTab}`}>
              {shownTab === "input" && (
                <InputPanel
                  text={inputText}
                  error={parsed.ok ? null : parsed.error}
                  readOnly={file !== null}
                  onChange={(t) => {
                    setInputText(t);
                    clearRun();
                  }}
                />
              )}
              {shownTab === "step" && (
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
              {shownTab === "log" && <LogPanel events={frame.events} />}
              {shownTab === "review" && reviewNode && result?.nodes[reviewNode.id]?.input && (
                <ReviewPanel key={result.events.length} node={reviewNode} input={result.nodes[reviewNode.id].input!} onDecide={decide} />
              )}
            </div>
          </div>
        </div>

        {result && frame.done && (
          <ResultPanel
            result={result}
            fileStem={def.id}
            labelOf={(id) => def.nodes.find((n) => n.id === id)?.label ?? id}
            onOpenReview={() => {
              setTab("review");
              document.getElementById("tab-review")?.focus();
            }}
          />
        )}
      </section>

      <section aria-labelledby="own-title" className="mt-[72px] flex flex-wrap gap-5">
        <div className="min-w-0 flex-[1_1_380px]">
          <p className="font-mono text-xs tracking-[0.08em] text-accent">BRING YOUR OWN</p>
          <h2 id="own-title" className="mt-2.5 font-serif text-[clamp(40px,4.4vw,60px)] leading-none">
            Run it on your own document.
          </h2>
          <p className="mt-4 max-w-[480px] text-[17px] leading-relaxed text-soft">
            Invoice extraction reads your PDF or image; email routing reads your .eml file. It&apos;s all read in your
            browser. Nothing is uploaded or stored, and the page can&apos;t contact other servers.
          </p>
        </div>
        <UploadBox
          accept={uploadKinds.map((k) => acceptByKind[k]).join(",")}
          file={file}
          error={fileError}
          disabled={processing !== null}
          onFile={attachFile}
          onRun={() => {
            runner.current?.scrollIntoView({ block: "start" });
            run();
          }}
          canRun={parsed.ok && !running}
          onClear={() => loadSample(sampleId)}
        />
      </section>
    </>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────

function TabBar({ items: tabs, value, onChange }: { items: { id: Tab; label: string }[]; value: Tab; onChange: (t: Tab) => void }) {
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
        className={`mt-2 w-full resize-y rounded-xl border bg-code p-3.5 font-mono text-[13px] leading-[1.7] text-fg ${
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
                className="flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-2 text-left text-sm transition hover:bg-surface-2"
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
        <p className="rounded-xl border border-border bg-code px-3 py-2 text-xs text-soft">
          <span className="text-accent">Simulated.</span> A deterministic mock stands in for the real service. No external
          system is contacted.
        </p>
      )}
      {badges[node.id] === "you" && (
        <p className="rounded-xl border border-border bg-code px-3 py-2 text-xs text-soft">
          <span className="text-accent">Your step.</span> The run really pauses here until you confirm or reject. Nothing
          is sent anywhere.
        </p>
      )}
      {badges[node.id] === "on device" && (
        <p className="rounded-xl border border-border bg-code px-3 py-2 text-xs text-soft">
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

function LogPanel({ events }: { events: RunResult["events"] }) {
  const list = useRef<HTMLOListElement>(null);
  // Keep the newest entry visible by scrolling the panel itself, never the page.
  useEffect(() => {
    const box = list.current?.parentElement;
    if (box) box.scrollTop = box.scrollHeight;
  }, [events.length]);

  if (!events.length) return <p className="text-xs text-muted">Run the workflow to see the execution log.</p>;
  const tone = { info: "text-soft", success: "text-ok", error: "text-danger", skip: "text-muted", wait: "text-accent" };
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

function ResultPanel({
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
          <span className="font-semibold text-accent">Paused at “{labelOf(result.waitingAt!)}”.</span> Check the fields in
          the Review tab, then confirm or reject.
        </p>
        <button
          type="button"
          onClick={onOpenReview}
          className="min-h-11 cursor-pointer rounded-full border border-border-strong px-4 text-sm font-semibold transition hover:bg-surface-2"
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
      {result.status === "success" && <p className="mt-2 font-semibold text-ok">The workflow completed.</p>}
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
            <button type="button" onClick={() => download(`${fileStem}-result.json`, `${pretty(result.output)}\n`, "application/json")} className="min-h-11 cursor-pointer rounded-full border border-border-strong px-4 font-semibold transition hover:bg-surface-2">
              Download JSON
            </button>
            <button type="button" onClick={() => download(`${fileStem}-result.csv`, toCsv(result.output!), "text/csv")} className="min-h-11 cursor-pointer rounded-full border border-border-strong px-4 font-semibold transition hover:bg-surface-2">
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
  accept,
  file,
  error,
  disabled,
  canRun,
  onFile,
  onRun,
  onClear,
}: {
  accept: string;
  file: File | null;
  error: string | null;
  disabled: boolean;
  canRun: boolean;
  onFile: (f: File) => void;
  onRun: () => void;
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
    <div className="min-w-0 flex-[1_1_420px]">
      {file ? (
        <div className="glass flex flex-col gap-4 rounded-[26px] border-2! border-[rgb(255_210_63/0.6)]! p-6 sm:p-8">
          <p className="min-w-0">
            <span className="block font-mono text-xs tracking-[0.06em] text-accent">READY ON THIS DEVICE</span>
            <span className="mt-2 block truncate text-lg font-semibold">{file.name}</span>
            <span className="text-sm text-soft">{formatBytes(file.size)} · not uploaded</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRun}
              disabled={!canRun}
              className="tap inline-flex min-h-11 cursor-pointer items-center rounded-full bg-accent px-5 text-[15px] font-bold text-accent-fg disabled:cursor-not-allowed disabled:opacity-40"
            >
              Run it
            </button>
            <button
              type="button"
              onClick={onClear}
              disabled={disabled}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-border-strong px-5 text-[15px] font-semibold transition-colors hover:bg-surface-2 disabled:opacity-40"
            >
              Remove file
            </button>
          </div>
        </div>
      ) : (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          className={`glass flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[26px] border-2! border-dashed! p-9 text-center transition-colors focus-within:border-accent! hover:border-accent! ${
            over ? "border-accent! bg-accent-soft!" : "border-white/28!"
          }`}
        >
          <svg aria-hidden="true" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
          </svg>
          <span className="text-lg font-semibold">Choose a file or drop it here</span>
          <span className="font-mono text-xs leading-[1.7] text-soft">
            PDF, PNG, JPG, WebP, TXT or .eml · up to 10 MB
            <br />
            first 5 PDF pages (3 with OCR) · English OCR
          </span>
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
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
      <p className="mt-3 text-[13px] text-muted">
        Read in this browser and never uploaded. Nothing is saved: it&apos;s gone when you reset or leave the page.
      </p>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

function activeAdapters(wf: PlaygroundWorkflow, file: File, onProgress: (m: string, f?: number) => void): AdapterRegistry {
  return wf.upload?.adapters ? wf.upload.adapters(file, onProgress) : wf.adapters;
}

/** How each step really runs: simulated, real work on the device, or a pause for the visitor ("you"). */
function stepBadges(wf: PlaygroundWorkflow, adapters: AdapterRegistry): Record<string, string> {
  const out: Record<string, string> = {};
  for (const n of wf.definition.nodes) {
    if (n.type === "review") out[n.id] = "you";
    if (n.type !== "integration") continue;
    const a = adapters[n.config.adapter];
    if (a?.simulated) out[n.id] = "simulated";
    else if (a?.runsLocally) out[n.id] = "on device";
  }
  return out;
}

const acceptByKind: Record<DocumentKind, string> = {
  pdf: ".pdf,application/pdf",
  image: ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp",
  text: ".txt,text/plain",
  email: ".eml,message/rfc822",
};
/** Every file kind some workflow can read. */
const uploadKinds = [...new Set(workflows.flatMap((w) => w.upload?.kinds ?? []))];

/** Reduced motion, or the site's Motion switch turned off: show runs finished at once. */
function instantReplay() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "off";
}

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
    <pre className="max-h-72 overflow-auto rounded-xl border border-border bg-code p-3.5 font-mono text-xs leading-relaxed">
      {pretty(value)}
    </pre>
  );
}
