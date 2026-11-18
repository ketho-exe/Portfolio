import { describe, expect, it } from "vitest";
import { runWorkflow } from "../engine";
import { expenseApproval } from "../workflows/expense-approval";
import { layoutWorkflow, NODE_HEIGHT, NODE_WIDTH } from "./layout";
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
});
