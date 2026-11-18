import { z } from "zod";
import { topologicalOrder, validateWorkflow } from "./graph";
import { executeNode, type AdapterRegistry, type NodeResult } from "./nodes";
import type { Data, NodeType } from "./schema";

export type NodeStatus = "success" | "error" | "skipped";

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
  level: "info" | "success" | "error" | "skip";
  nodeId?: string;
  message: string;
};

export type RunResult = {
  status: "success" | "failed" | "invalid";
  /** Execution order (topological). Empty when invalid. */
  order: string[];
  nodes: Record<string, NodeRun>;
  /** Ordered log. The UI replays it to animate progress. */
  events: RunEvent[];
  output?: Data;
  error?: string;
  /** Present when status is "invalid": what is wrong with the workflow or input. */
  issues?: string[];
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

export function createStepClock(): () => number {
  let t = 0;
  return () => t++;
}

/**
 * Validate, then execute every node once in topological order.
 * - Condition nodes make only their matching branch "live"; nodes with no live inbound edge are skipped.
 * - A node with several live inbound edges receives their data shallow-merged in edge order.
 * - The first error stops the run; every remaining node is skipped.
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

  const order = topologicalOrder(wf)!; // validateWorkflow already rejected cycles
  const byId = new Map(wf.nodes.map((n) => [n.id, n]));
  const edgeState = new Map<string, { live: boolean; data?: Data }>();
  const nodes: Record<string, NodeRun> = {};
  const events: RunEvent[] = [];
  const log = (level: RunEvent["level"], message: string, nodeId?: string) =>
    events.push({ seq: events.length, at: now(), level, nodeId, message });

  let failure: { nodeId: string; error: string } | null = null;
  log("info", `Run started: ${wf.name}`);

  for (const id of order) {
    const node = byId.get(id)!;
    const inbound = wf.edges.filter((e) => e.target === id);
    const outbound = wf.edges.filter((e) => e.source === id);
    const base = { nodeId: id, label: node.label, type: node.type };

    const skip = (reason: string) => {
      nodes[id] = { ...base, status: "skipped", note: reason };
      for (const e of outbound) edgeState.set(e.id, { live: false });
      log("skip", `${node.label}: ${reason}`, id);
    };

    if (failure) {
      skip("not run because an earlier step failed");
      continue;
    }

    let nodeInput: Data;
    if (node.type === "trigger") {
      nodeInput = parsedInput.data;
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
    const limit = node.type === "integration" ? (node.config.timeoutMs ?? timeoutMs) : timeoutMs;
    const result = await withTimeout(safeExecute(node, nodeInput, adapters), limit);
    const endedAt = now();
    const simulated = node.type === "integration" ? adapters[node.config.adapter].simulated : undefined;

    if (!result.ok) {
      nodes[id] = { ...base, status: "error", input: nodeInput, error: result.error, details: result.details, simulated, startedAt, endedAt };
      for (const e of outbound) edgeState.set(e.id, { live: false });
      failure = { nodeId: id, error: result.error };
      log("error", `${node.label} failed: ${result.error}`, id);
      continue;
    }

    nodes[id] = {
      ...base,
      status: "success",
      input: nodeInput,
      output: result.output,
      branch: result.branch,
      note: result.note,
      simulated,
      startedAt,
      endedAt,
    };
    for (const e of outbound) {
      const live = node.type !== "condition" || e.sourceHandle === result.branch;
      edgeState.set(e.id, live ? { live, data: result.output } : { live });
    }
    log("success", `${node.label} completed${result.note ? ` (${result.note})` : ""}`, id);
  }

  if (failure) {
    log("error", `Run failed at "${byId.get(failure.nodeId)!.label}".`);
    return { status: "failed", order, nodes, events, error: failure.error };
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
