import { z } from "zod";
import { topologicalOrder, validateWorkflow } from "./graph";
import { executeNode, type AdapterRegistry, type NodeResult } from "./nodes";
import { applyReview } from "./review";
import type { Data, NodeType, Workflow, WorkflowNode } from "./schema";

/** "waiting": a review step is paused until a person decides. */
export type NodeStatus = "success" | "error" | "skipped" | "waiting";

export type NodeRun = {
  nodeId: string;
  label: string;
  type: NodeType;
  status: NodeStatus;
  input?: Data;
  output?: Data;
  branch?: "true" | "false";
  note?: string;
  error?: string;
  details?: string[];
  /** True when the step used a mock adapter. The UI must label it as a simulation. */
  simulated?: boolean;
  startedAt?: number;
  endedAt?: number;
};

export type RunEvent = {
  seq: number;
  at: number;
  level: "info" | "success" | "error" | "skip" | "wait";
  nodeId?: string;
  message: string;
};

export type RunResult = {
  /** "waiting": paused at a review step. Pass the result to `resumeWorkflow` with the person's decision. */
  status: "success" | "failed" | "invalid" | "waiting";
  /** Execution order (topological). Empty when invalid. */
  order: string[];
  nodes: Record<string, NodeRun>;
  /** Ordered log. The UI replays it to animate progress. */
  events: RunEvent[];
  output?: Data;
  error?: string;
  /** Present when status is "invalid": what is wrong with the workflow or input. */
  issues?: string[];
  /** Present when status is "waiting": the review step that needs a decision. */
  waitingAt?: string;
};

export type RunOptions = {
  adapters?: AdapterRegistry;
  /** Injected clock. The default is a logical step counter, so results are deterministic. */
  now?: () => number;
  /** Per-step limit for adapters (ms). */
  timeoutMs?: number;
  /** Maximum size of the JSON input. */
  maxInputBytes?: number;
};

const InputSchema = z.record(z.string(), z.json());

export function createStepClock(start = 0): () => number {
  let t = start;
  return () => t++;
}

/**
 * Validate, then execute every node once in topological order.
 * - Condition nodes make only their matching branch "live"; nodes with no live inbound edge are skipped.
 * - A node with several live inbound edges receives their data shallow-merged in edge order.
 * - The first error stops the run; every remaining node is skipped.
 * - A review node pauses the run (status "waiting") until `resumeWorkflow` applies a person's decision.
 * Never throws: every failure is reported in the result.
 */
export async function runWorkflow(definition: unknown, input: unknown, options: RunOptions = {}): Promise<RunResult> {
  const { adapters = {}, now = createStepClock(), timeoutMs = 5000, maxInputBytes = 10_000 } = options;
  const invalid = (issues: string[]): RunResult => ({ status: "invalid", order: [], nodes: {}, events: [], issues });

  const validation = validateWorkflow(definition);
  if (!validation.ok) return invalid(validation.issues);
  const wf = validation.workflow;

  const missingAdapters = wf.nodes.flatMap((n) =>
    n.type === "integration" && !Object.hasOwn(adapters, n.config.adapter)
      ? [`Node "${n.id}" uses unknown adapter "${n.config.adapter}".`]
      : [],
  );
  if (missingAdapters.length) return invalid(missingAdapters);

  const parsedInput = InputSchema.safeParse(input);
  if (!parsedInput.success) return invalid(["Input must be a JSON object."]);
  if (JSON.stringify(parsedInput.data).length > maxInputBytes) {
    return invalid([`Input is too large (limit ${maxInputBytes} characters).`]);
  }

  const ctx = createContext(wf, now, adapters, timeoutMs, [], {});
  ctx.log("info", `Run started: ${wf.name}`);
  return proceed(ctx, 0, parsedInput.data);
}

/**
 * Continues a run that paused at a review step, applying the person's decision there.
 * Approve (with any corrections) carries on with the next steps; reject fails the run at the review step.
 * Never throws.
 */
export async function resumeWorkflow(
  definition: unknown,
  paused: RunResult,
  decision: unknown,
  options: Omit<RunOptions, "maxInputBytes"> = {},
): Promise<RunResult> {
  const invalid = (issue: string): RunResult => ({ status: "invalid", order: [], nodes: {}, events: [], issues: [issue] });
  const validation = validateWorkflow(definition);
  if (!validation.ok) return invalid(validation.issues.join(" "));
  const wf = validation.workflow;

  const node = wf.nodes.find((n) => n.id === paused.waitingAt);
  const record = node ? paused.nodes[node.id] : undefined;
  if (paused.status !== "waiting" || node?.type !== "review" || record?.status !== "waiting" || !record.input) {
    return invalid("This run is not waiting for a review.");
  }

  const lastAt = paused.events.at(-1)?.at ?? 0;
  const { adapters = {}, now = createStepClock(lastAt + 1), timeoutMs = 5000 } = options;
  const ctx = createContext(wf, now, adapters, timeoutMs, structuredClone(paused.events), structuredClone(paused.nodes));
  ctx.restoreEdges();

  const result = applyReview(node, record.input, decision);
  ctx.settle(node, record.input, result, record.startedAt);
  return proceed(ctx, ctx.order.indexOf(node.id) + 1);
}

type EdgeState = { live: boolean; data?: Data };
type Context = ReturnType<typeof createContext>;

function createContext(
  wf: Workflow,
  now: () => number,
  adapters: AdapterRegistry,
  timeoutMs: number,
  events: RunEvent[],
  nodes: Record<string, NodeRun>,
) {
  const order = topologicalOrder(wf)!; // validateWorkflow already rejected cycles
  const byId = new Map(wf.nodes.map((n) => [n.id, n]));
  const edgeState = new Map<string, EdgeState>();
  const log = (level: RunEvent["level"], message: string, nodeId?: string) =>
    events.push({ seq: events.length, at: now(), level, nodeId, message });
  const outbound = (id: string) => wf.edges.filter((e) => e.source === id);
  const failure = { current: null as { nodeId: string; error: string } | null };

  /** Marks a node's outgoing edges live (carrying its output) or dead. */
  const setEdges = (node: WorkflowNode, run: NodeRun) => {
    for (const e of outbound(node.id)) {
      const live = run.status === "success" && (node.type !== "condition" || e.sourceHandle === run.branch);
      edgeState.set(e.id, live ? { live, data: run.output } : { live: false });
    }
  };

  /** Records a finished step and logs it. */
  const settle = (node: WorkflowNode, input: Data, result: NodeResult, startedAt: number | undefined) => {
    const base = { nodeId: node.id, label: node.label, type: node.type };
    const endedAt = now();
    const simulated = node.type === "integration" ? adapters[node.config.adapter]?.simulated : undefined;
    if (!result.ok) {
      nodes[node.id] = { ...base, status: "error", input, error: result.error, details: result.details, simulated, startedAt, endedAt };
      failure.current = { nodeId: node.id, error: result.error };
      log("error", `${node.label} failed: ${result.error}`, node.id);
    } else {
      nodes[node.id] = { ...base, status: "success", input, output: result.output, branch: result.branch, note: result.note, simulated, startedAt, endedAt };
      log("success", `${node.label} completed${result.note ? ` (${result.note})` : ""}`, node.id);
    }
    setEdges(node, nodes[node.id]);
  };

  /** Rebuilds edge state from the steps that already ran (used when resuming). */
  const restoreEdges = () => {
    for (const id of order) if (nodes[id] && nodes[id].status !== "waiting") setEdges(byId.get(id)!, nodes[id]);
  };

  return { wf, order, byId, edgeState, nodes, events, log, now, adapters, timeoutMs, outbound, failure, settle, restoreEdges };
}

/** Executes nodes in order from `from`, until the end, a failure (the rest are skipped) or a review step. */
async function proceed(ctx: Context, from: number, triggerInput?: Data): Promise<RunResult> {
  const { wf, order, byId, edgeState, nodes, events, log, now, adapters, timeoutMs, failure } = ctx;

  for (const id of order.slice(from)) {
    const node = byId.get(id)!;
    const inbound = wf.edges.filter((e) => e.target === id);
    const base = { nodeId: id, label: node.label, type: node.type };

    const skip = (reason: string) => {
      nodes[id] = { ...base, status: "skipped", note: reason };
      for (const e of ctx.outbound(id)) edgeState.set(e.id, { live: false });
      log("skip", `${node.label}: ${reason}`, id);
    };

    if (failure.current) {
      skip("not run because an earlier step failed");
      continue;
    }

    let nodeInput: Data;
    if (node.type === "trigger") {
      nodeInput = triggerInput ?? {};
    } else {
      const live = inbound.map((e) => edgeState.get(e.id)).filter((s) => s?.live);
      if (!live.length) {
        skip("branch not taken");
        continue;
      }
      nodeInput = Object.assign({}, ...live.map((s) => s!.data));
    }

    const startedAt = now();
    log("info", `${node.label} started`, id);

    if (node.type === "review") {
      const count = node.config.fields.length;
      nodes[id] = { ...base, status: "waiting", input: nodeInput, note: `Waiting for a person to check ${count} fields`, startedAt };
      log("wait", `${node.label}: waiting for a person to check ${count} fields`, id);
      return { status: "waiting", order, nodes, events, waitingAt: id };
    }

    const limit = node.type === "integration" ? (node.config.timeoutMs ?? timeoutMs) : timeoutMs;
    const result = await withTimeout(safeExecute(node, nodeInput, adapters), limit);
    ctx.settle(node, nodeInput, result, startedAt);
  }

  if (failure.current) {
    log("error", `Run failed at "${byId.get(failure.current.nodeId)!.label}".`);
    return { status: "failed", order, nodes, events, error: failure.current.error };
  }

  const finished = order.find((id) => byId.get(id)!.type === "output" && nodes[id].status === "success");
  log("success", "Run completed.");
  return { status: "success", order, nodes, events, output: finished ? nodes[finished].output : undefined };
}

/** Turns unexpected exceptions into a safe, generic error (no stack traces or internals in the UI). */
async function safeExecute(...args: Parameters<typeof executeNode>): Promise<NodeResult> {
  try {
    return await executeNode(...args);
  } catch {
    return { ok: false, error: "Unexpected error in this step." };
  }
}

async function withTimeout(promise: Promise<NodeResult>, ms: number): Promise<NodeResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<NodeResult>((resolve) => {
    timer = setTimeout(() => resolve({ ok: false, error: `Step timed out after ${ms} ms.` }), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
