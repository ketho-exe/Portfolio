import { describe, expect, it } from "vitest";
import { resumeWorkflow, reviewItems, runWorkflow, validateWorkflow, type NodeOf, type Workflow } from "./index";
import { linear, output, trigger } from "./test-fixtures";

// start → check (review) → tidy → end
const def = linear([
  trigger,
  {
    id: "check",
    type: "review",
    label: "Check fields",
    config: {
      fields: [
        { field: "doc.name", label: "Name", confidence: "conf.name" },
        { field: "doc.total", label: "Total", kind: "number", confidence: "conf.total" },
        { field: "doc.date", label: "Date", kind: "date" },
        { field: "doc.currency", label: "Currency", options: ["GBP", "EUR"] },
      ],
      reference: "text",
    },
  },
  { id: "tidy", type: "transform", label: "Tidy", config: { assign: [{ field: "done", value: { literal: true } }] } },
  output(["doc", "review", "done"]),
]);

const input = {
  text: "Acme Ltd ... 12.50",
  doc: { name: "Acme Ltd", total: 12.5, date: null, currency: "GBP" },
  conf: { name: 0.96, total: 0.6 },
};

const reviewNode = () => (validateWorkflow(def) as { workflow: Workflow }).workflow.nodes[1] as NodeOf<"review">;

describe("review steps", () => {
  it("pause the run and leave later steps unrun", async () => {
    const r = await runWorkflow(def, input);
    expect(r.status).toBe("waiting");
    expect(r.waitingAt).toBe("check");
    expect(r.nodes.check).toMatchObject({ status: "waiting", input });
    expect(r.nodes.tidy).toBeUndefined();
    expect(r.events.at(-1)).toMatchObject({ level: "wait", nodeId: "check" });
  });

  it("flag low-confidence and missing fields for the reviewer", () => {
    const items = reviewItems(reviewNode(), input);
    expect(items.map((i) => [i.label, i.flagged])).toEqual([
      ["Name", false],
      ["Total", true],
      ["Date", true],
      ["Currency", false],
    ]);
    expect(items[1]).toMatchObject({ value: 12.5, confidence: 0.6, kind: "number" });
  });

  it("continue after approval, applying corrections and recording them", async () => {
    const paused = await runWorkflow(def, input);
    const r = await resumeWorkflow(def, paused, { action: "approve", values: { "doc.total": "1,250.00", "doc.date": "2026-03-04", "doc.name": "Acme Ltd" } });
    expect(r.status).toBe("success");
    expect(r.output).toEqual({
      doc: { name: "Acme Ltd", total: 1250, date: "2026-03-04", currency: "GBP" },
      review: { decision: "approved", checked: 4, flagged: ["total", "date"], corrected: ["total", "date"] },
      done: true,
    });
    expect(r.nodes.check).toMatchObject({ status: "success", note: "Approved with 2 corrections" });
    // The log continues from the pause rather than starting again.
    expect(r.events.slice(0, paused.events.length)).toEqual(paused.events);
    expect(r.events.map((e) => e.seq)).toEqual(r.events.map((_, i) => i));
  });

  it("leave the paused result untouched", async () => {
    const paused = await runWorkflow(def, input);
    const copy = structuredClone(paused);
    await resumeWorkflow(def, paused, { action: "approve" });
    expect(paused).toEqual(copy);
  });

  it("fail the run when the reviewer rejects", async () => {
    const r = await resumeWorkflow(def, await runWorkflow(def, input), { action: "reject", reason: "Not an invoice" });
    expect(r.status).toBe("failed");
    expect(r.error).toBe("Rejected in review: Not an invoice");
    expect(r.nodes.tidy.status).toBe("skipped");
  });

  it("reject values of the wrong type, listing each problem", async () => {
    const r = await resumeWorkflow(def, await runWorkflow(def, input), {
      action: "approve",
      values: { "doc.total": "twelve", "doc.date": "4 March", "doc.currency": "JPY" },
    });
    expect(r.status).toBe("failed");
    expect(r.nodes.check.details).toEqual([
      "Total must be a number",
      "Date must be a date (YYYY-MM-DD)",
      "Currency must be one of GBP, EUR",
    ]);
  });

  it("only change the fields listed on the step", async () => {
    const r = await resumeWorkflow(def, await runWorkflow(def, input), {
      action: "approve",
      values: { "conf.total": 1, text: "changed", "__proto__.x": 1 },
    });
    expect(r.status).toBe("success");
    expect(r.nodes.tidy.input).toMatchObject({ conf: input.conf, text: input.text });
    expect(r.output?.review).toMatchObject({ corrected: [] });
  });

  it("treat blank values as missing", async () => {
    const r = await resumeWorkflow(def, await runWorkflow(def, input), { action: "approve", values: { "doc.name": "  " } });
    expect(r.output?.doc).toMatchObject({ name: null });
  });

  it("refuse to resume a run that isn't waiting, or a malformed decision", async () => {
    const done = await runWorkflow(linear([trigger, output()]), {});
    expect((await resumeWorkflow(def, done, { action: "approve" })).status).toBe("invalid");
    const r = await resumeWorkflow(def, await runWorkflow(def, input), { action: "maybe" });
    expect(r).toMatchObject({ status: "failed", error: "The review decision is not valid." });
  });
});
