import { WorkflowSchema, type Workflow, type WorkflowEdge } from "./schema";

export type ValidationResult = { ok: true; workflow: Workflow } | { ok: false; issues: string[] };

/**
 * Parse the definition, then check the graph is something the engine can run safely:
 * one trigger, known endpoints, correct branch handles, no cycles, everything reachable.
 */
export function validateWorkflow(definition: unknown): ValidationResult {
  const parsed = WorkflowSchema.safeParse(definition);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => `${i.path.join(".") || "workflow"}: ${i.message}`),
    };
  }

  const wf = parsed.data;
  const issues: string[] = [];
  const nodes = new Map(wf.nodes.map((n) => [n.id, n]));

  if (nodes.size !== wf.nodes.length) issues.push("Node ids must be unique.");
  if (new Set(wf.edges.map((e) => e.id)).size !== wf.edges.length) issues.push("Edge ids must be unique.");

  const triggers = wf.nodes.filter((n) => n.type === "trigger");
  if (triggers.length !== 1) issues.push(`Expected exactly one trigger node, found ${triggers.length}.`);
  if (!wf.nodes.some((n) => n.type === "output")) issues.push("Expected at least one output node.");

  for (const edge of wf.edges) {
    const source = nodes.get(edge.source);
    const target = nodes.get(edge.target);
    if (!source) issues.push(`Edge "${edge.id}" starts at unknown node "${edge.source}".`);
    if (!target) issues.push(`Edge "${edge.id}" ends at unknown node "${edge.target}".`);
    if (!source || !target) continue;

    if (target.type === "trigger") issues.push(`Edge "${edge.id}" points into the trigger node.`);
    if (source.type === "output") issues.push(`Edge "${edge.id}" leaves an output node.`);
    if (source.type === "condition" && !edge.sourceHandle) {
      issues.push(`Edge "${edge.id}" leaves condition "${source.id}" without a "true"/"false" handle.`);
    }
    if (source.type !== "condition" && edge.sourceHandle) {
      issues.push(`Edge "${edge.id}" has a branch handle but "${source.id}" is not a condition.`);
    }
  }

  if (issues.length) return { ok: false, issues };

  if (topologicalOrder(wf) === null) return { ok: false, issues: ["Workflow contains a cycle; loops are not supported."] };

  const reachable = reachableFrom(triggers[0].id, wf.edges);
  const unreachable = wf.nodes.filter((n) => !reachable.has(n.id)).map((n) => n.id);
  if (unreachable.length) issues.push(`Unreachable from the trigger: ${unreachable.join(", ")}.`);

  return issues.length ? { ok: false, issues } : { ok: true, workflow: wf };
}

/**
 * Kahn's algorithm. Ties are broken by the order nodes appear in the definition,
 * so execution order is stable and deterministic. Returns null if there is a cycle.
 */
export function topologicalOrder(wf: Workflow): string[] | null {
  const indegree = new Map(wf.nodes.map((n) => [n.id, 0]));
  for (const e of wf.edges) indegree.set(e.target, (indegree.get(e.target) ?? 0) + 1);

  const position = new Map(wf.nodes.map((n, i) => [n.id, i]));
  const ready = wf.nodes.filter((n) => indegree.get(n.id) === 0).map((n) => n.id);
  const order: string[] = [];

  while (ready.length) {
    ready.sort((a, b) => position.get(a)! - position.get(b)!);
    const id = ready.shift()!;
    order.push(id);
    for (const e of wf.edges) {
      if (e.source !== id) continue;
      const d = indegree.get(e.target)! - 1;
      indegree.set(e.target, d);
      if (d === 0) ready.push(e.target);
    }
  }
  return order.length === wf.nodes.length ? order : null;
}

function reachableFrom(start: string, edges: WorkflowEdge[]): Set<string> {
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length) {
    const id = stack.pop()!;
    for (const e of edges) {
      if (e.source === id && !seen.has(e.target)) {
        seen.add(e.target);
        stack.push(e.target);
      }
    }
  }
  return seen;
}
