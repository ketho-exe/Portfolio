"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { resumeWorkflow, runWorkflow, validateWorkflow, type AdapterRegistry, type Data, type ReviewDecision, type RunResult } from "../engine";
import { checkFile, documentKind, formatBytes } from "../intake/limits";
import { workflows, type PlaygroundWorkflow } from "../workflows";
import { canvasHeight, layoutWorkflow } from "./layout";
import { LogPanel } from "./log-panel";
import { InputPanel, pretty, ResultPanel, StepPanel, TabBar, type Tab } from "./panels";
import { eventDelay, replayFrame } from "./replay";
import { ReviewPanel } from "./review-panel";
import { acceptByKind, UploadBox, uploadKinds } from "./upload-box";

// React Flow measures the DOM, so it renders on the client only. The placeholder keeps the height stable.
const FlowGraph = dynamic(() => import("./flow-graph"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center font-mono text-xs text-muted">Loading graph…</div>,
});

const baseTabs: { id: Tab; label: string }[] = [
  { id: "input", label: "Input" },
  { id: "step", label: "Steps" },
  { id: "log", label: "Log" },
];
// Shown only while a run is paused for the visitor's review.
const reviewTabs: { id: Tab; label: string }[] = [...baseTabs, { id: "review", label: "Review" }];

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

  const control = "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-control px-4 text-base font-medium";

  return (
    <>
      <section ref={runner} aria-label="Workflow runner" className="panel mt-8 scroll-mt-24 overflow-hidden rounded-card">
        {/* Workflow picker and run controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div role="group" aria-label="Workflow" className="inline-flex flex-wrap gap-1 rounded-control bg-surface-2 p-1">
            {workflows.map((w, i) => (
              <button
                key={w.definition.id}
                type="button"
                aria-pressed={i === workflowIndex}
                onClick={() => pickWorkflow(i)}
                className={`min-h-10 cursor-pointer rounded-chip px-4 text-sm font-medium transition-colors ${
                  i === workflowIndex ? "bg-white/10 text-fg shadow-[inset_0_0_0_1px_var(--border)]" : "text-soft hover:text-fg"
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
              className={`${control} tap bg-accent px-6 font-medium text-accent-fg disabled:cursor-not-allowed disabled:opacity-40`}
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
            <p className="mt-2 text-base leading-relaxed text-soft text-pretty">{def.description}</p>
          </div>
          <label className="flex shrink-0 flex-col gap-2 font-mono text-xs text-muted">
            Sample input
            <select
              value={file ? "" : sampleId}
              onChange={(e) => loadSample(e.target.value)}
              className="h-11 min-w-56 cursor-pointer rounded-chip border border-border-strong bg-surface-solid px-3 font-sans text-base tracking-normal text-fg normal-case"
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

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5 text-sm sm:px-5">
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
          <p className="font-mono text-xs text-accent">Bring your own</p>
          <h2 id="own-title" className="mt-3 font-serif text-display-3 leading-none">
            Run it on your own document.
          </h2>
          <p className="mt-4 max-w-[480px] text-lg leading-relaxed text-soft">
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

/** Reduced motion, or the site's Motion switch turned off: show runs finished at once. */
function instantReplay() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "off";
}
