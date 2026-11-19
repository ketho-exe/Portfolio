import type { RunEvent, RunResult, WorkflowInput } from "../engine";

export type UiStatus = "idle" | "running" | "success" | "error" | "skipped" | "waiting";
export type EdgeState = "idle" | "taken" | "not-taken";

export type ReplayFrame = {
  statuses: Record<string, UiStatus>;
  edges: Record<string, EdgeState>;
  events: RunEvent[];
  done: boolean;
};

const levelStatus: Record<RunEvent["level"], UiStatus> = {
  info: "running",
  success: "success",
  error: "error",
  skip: "skipped",
  wait: "waiting",
};

/**
 * What the UI should show after the first `cursor` events of a finished run.
 * The engine runs instantly; the UI steps a cursor through its event log to animate progress.
 * A run paused for review is "done" once the cursor reaches the pause; resuming appends events.
 */
export function replayFrame(
  def: Pick<WorkflowInput, "nodes" | "edges">,
  result: RunResult | null,
  cursor: number,
): ReplayFrame {
  const statuses: Record<string, UiStatus> = Object.fromEntries(def.nodes.map((n) => [n.id, "idle"]));
  const edges: Record<string, EdgeState> = Object.fromEntries(def.edges.map((e) => [e.id, "idle"]));
  if (!result) return { statuses, edges, events: [], done: false };

  const events = result.events.slice(0, Math.max(0, cursor));
  for (const ev of events) {
    if (!ev.nodeId) continue;
    statuses[ev.nodeId] = levelStatus[ev.level];
  }

  for (const e of def.edges) {
    const source = statuses[e.source];
    if (source === "success") {
      const branch = result.nodes[e.source]?.branch;
      edges[e.id] = !branch || e.sourceHandle === branch ? "taken" : "not-taken";
    } else if (source === "error" || source === "skipped") {
      edges[e.id] = "not-taken";
    }
  }

  return { statuses, edges, events, done: cursor >= result.events.length };
}

/** Delay before showing the next event: steps that run are slower than skips, so the path reads clearly. */
export function eventDelay(event: RunEvent | undefined): number {
  if (!event) return 0;
  if (event.level === "skip") return 80;
  if (!event.nodeId) return 200;
  return event.level === "info" ? 260 : 340;
}
