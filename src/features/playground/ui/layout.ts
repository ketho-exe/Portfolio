import type { WorkflowInput } from "../engine";

export const NODE_WIDTH = 188;
export const NODE_HEIGHT = 54;
const COL_GAP = 28;
const ROW_GAP = 30;

export type Position = { x: number; y: number };

/**
 * Top-to-bottom layered layout. Layer = longest path from the trigger, so a join sits below
 * every branch that feeds it. Within a layer, "true" branches go left of "false" branches;
 * otherwise definition order. Edges that skip a layer get their own lane. Pure and deterministic.
 */
export function layoutWorkflow(def: Pick<WorkflowInput, "nodes" | "edges">): Record<string, Position> {
  const depth = new Map<string, number>(def.nodes.map((n) => [n.id, 0]));
  // Relax edges |nodes| times: enough for any acyclic graph (validated workflows have no cycles).
  for (let i = 0; i < def.nodes.length; i++) {
    for (const e of def.edges) {
      const d = (depth.get(e.source) ?? 0) + 1;
      if (d > (depth.get(e.target) ?? 0)) depth.set(e.target, d);
    }
  }

  const handleRank = (handle: string | undefined) => (handle === "true" ? 0 : handle === "false" ? 2 : 1);
  const rank = (id: string) => handleRank(def.edges.find((e) => e.target === id && e.sourceHandle)?.sourceHandle);

  // Each layer holds its nodes plus a gap for every edge passing through it (e.g. a "true" branch that
  // skips straight to a join), so a long edge never runs behind a node. Gaps take space but aren't placed.
  type Slot = { id?: string; rank: number };
  const layers = new Map<number, Slot[]>();
  const add = (d: number, slot: Slot) => layers.set(d, [...(layers.get(d) ?? []), slot]);
  def.nodes.forEach((n) => add(depth.get(n.id)!, { id: n.id, rank: rank(n.id) }));
  for (const e of def.edges) {
    for (let d = depth.get(e.source)! + 1; d < depth.get(e.target)!; d++) add(d, { rank: handleRank(e.sourceHandle) });
  }

  const positions: Record<string, Position> = {};
  for (const [d, slots] of layers) {
    // Stable sort keeps definition order within a rank.
    const sorted = [...slots].sort((a, b) => a.rank - b.rank);
    const totalWidth = sorted.length * NODE_WIDTH + (sorted.length - 1) * COL_GAP;
    sorted.forEach((slot, i) => {
      if (slot.id) positions[slot.id] = { x: i * (NODE_WIDTH + COL_GAP) - totalWidth / 2, y: d * (NODE_HEIGHT + ROW_GAP) };
    });
  }
  return positions;
}

/**
 * Canvas height that shows the graph at roughly 85% scale, so long workflows stay readable
 * instead of shrinking to fit a fixed box. Clamped to keep short and very long graphs sensible.
 */
export function canvasHeight(positions: Record<string, Position>): number {
  const ys = Object.values(positions).map((p) => p.y);
  const graph = ys.length ? Math.max(...ys) - Math.min(...ys) + NODE_HEIGHT : 0;
  return Math.min(960, Math.max(480, Math.round(graph * 0.85) + 48));
}
