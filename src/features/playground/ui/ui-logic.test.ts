import { describe, expect, it } from "vitest";
import { resumeWorkflow, runWorkflow } from "../engine";
import { documentProcessing } from "../workflows/document-processing";
import { expenseApproval } from "../workflows/expense-approval";
import { workflows } from "../workflows";
import { canvasHeight, layoutWorkflow, NODE_HEIGHT, NODE_WIDTH } from "./layout";
import { replayFrame } from "./replay";

const def = expenseApproval.definition;
const runSample = (id: string) =>
  runWorkflow(def, expenseApproval.samples.find((s) => s.id === id)!.input, { adapters: expenseApproval.adapters });

describe("layoutWorkflow", () => {
  const pos = layoutWorkflow(def);

  it("places every node, top to bottom by dependency", () => {
    expect(Object.keys(pos).sort()).toEqual(def.nodes.map((n) => n.id).sort());
    for (const e of def.edges) expect(pos[e.target].y).toBeGreaterThan(pos[e.source].y);
  });

  it("puts true branches left of false branches, and joins below both", () => {
    expect(pos["auto-approve"].x).toBeLessThan(pos.manager.x);
    expect(pos.post.x).toBeLessThan(pos.return.x);
    expect(pos.approved.y).toBeGreaterThan(pos.manager.y);
  });

  it("keeps a branch that skips a layer clear of the nodes in that layer", () => {
    const doc = layoutWorkflow(documentProcessing.definition);
    // confident ─true→ schema passes the review layer: review moves aside, so the edge runs beside it.
    expect(doc.schema.x).toBe(doc.confident.x);
    expect(Math.abs(doc.review.x - doc.confident.x)).toBeGreaterThanOrEqual(NODE_WIDTH / 2);
  });

  it("never overlaps nodes", () => {
    const boxes = Object.values(pos);
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const overlap =
          Math.abs(boxes[i].x - boxes[j].x) < NODE_WIDTH && Math.abs(boxes[i].y - boxes[j].y) < NODE_HEIGHT;
        expect(overlap).toBe(false);
      }
    }
  });
});

describe("canvasHeight", () => {
  it("grows with the graph but stays within bounds", () => {
    const heights = workflows.map((w) => canvasHeight(layoutWorkflow(w.definition)));
    for (const h of heights) {
      expect(h).toBeGreaterThanOrEqual(480);
      expect(h).toBeLessThanOrEqual(960);
    }
    expect(canvasHeight({})).toBe(480);
    expect(canvasHeight({ a: { x: 0, y: 0 }, b: { x: 0, y: 5000 } })).toBe(960);
    // Taller graph → taller canvas.
    expect(canvasHeight({ a: { x: 0, y: 0 }, b: { x: 0, y: 900 } })).toBeGreaterThan(
      canvasHeight({ a: { x: 0, y: 0 }, b: { x: 0, y: 600 } }),
    );
  });
});

describe("replayFrame", () => {
  it("is all idle before a run", () => {
    const f = replayFrame(def, null, 0);
    expect(new Set(Object.values(f.statuses))).toEqual(new Set(["idle"]));
    expect(f.done).toBe(false);
  });

  it("shows the step being executed as running", async () => {
    const r = await runSample("auto");
    const started = r.events.findIndex((e) => e.nodeId === "validate" && e.level === "info");
    const f = replayFrame(def, r, started + 1);
    expect(f.statuses.submit).toBe("success");
    expect(f.statuses.validate).toBe("running");
    expect(f.statuses.categorise).toBe("idle");
    expect(f.edges["submit-validate"]).toBe("taken");
  });

  it("matches the engine result once fully replayed", async () => {
    const r = await runSample("over-limit");
    const f = replayFrame(def, r, r.events.length);
    expect(f.done).toBe(true);
    for (const id of r.order) expect(f.statuses[id]).toBe(r.nodes[id].status);
    expect(f.edges["policy-manager"]).toBe("taken");
    expect(f.edges["policy-auto"]).toBe("not-taken");
    expect(f.edges["approved-return"]).toBe("taken");
    expect(f.edges["post-result"]).toBe("not-taken");
  });

  it("marks everything after a failure as not taken", async () => {
    const r = await runSample("invalid");
    const f = replayFrame(def, r, r.events.length);
    expect(f.statuses.validate).toBe("error");
    expect(f.edges["validate-categorise"]).toBe("not-taken");
    expect(f.statuses.result).toBe("skipped");
  });

  it("shows a paused review step as waiting, then carries on after the decision", async () => {
    const doc = documentProcessing.definition;
    const sample = documentProcessing.samples.find((s) => s.id === "low-confidence")!;
    const paused = await runWorkflow(doc, sample.input, { adapters: documentProcessing.adapters });
    const f = replayFrame(doc, paused, paused.events.length);
    expect(f.done).toBe(true);
    expect(f.statuses.review).toBe("waiting");
    expect(f.statuses.schema).toBe("idle");
    expect(f.edges["review-schema"]).toBe("idle");

    const resumed = await resumeWorkflow(doc, paused, { action: "approve" });
    const g = replayFrame(doc, resumed, paused.events.length);
    expect(g.done).toBe(false);
    expect(replayFrame(doc, resumed, resumed.events.length).statuses.result).toBe("success");
  });
});
