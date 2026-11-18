import { describe, expect, it } from "vitest";
import { runWorkflow } from "./run";
import { adapter, expenseWorkflow, linear, mockAdapters, output, trigger, validExpense } from "./test-fixtures";

const run = (input: unknown, opts = {}) => runWorkflow(expenseWorkflow, input, { adapters: mockAdapters, ...opts });

describe("runWorkflow: expense approval", () => {
  it("auto-approves a small expense via the true branch", async () => {
    const r = await run(validExpense);
    expect(r.status).toBe("success");
    expect(r.output).toEqual({ amount: 42.5, "approval.status": "approved", "approval.by": "policy", ledgerRef: "LED-42.5" });
    expect(r.nodes.small).toMatchObject({ status: "success", branch: "true" });
    expect(r.nodes.manager).toMatchObject({ status: "skipped", note: "branch not taken" });
    expect(r.nodes.ledger.simulated).toBe(true);
  });

  it("routes a large expense to manager approval via the false branch", async () => {
    const r = await run({ ...validExpense, amount: 2500 });
    expect(r.status).toBe("success");
    expect(r.nodes.small.branch).toBe("false");
    expect(r.nodes.auto.status).toBe("skipped");
    expect(r.output).toMatchObject({ "approval.status": "rejected", "approval.by": "manager" });
  });

  it("records each node's input and output", async () => {
    const r = await run(validExpense);
    expect(r.nodes.start.input).toEqual(validExpense);
    expect(r.nodes.auto.output).toEqual({ ...validExpense, approval: { status: "approved", by: "policy" } });
    expect(r.nodes.ledger.input).toEqual(r.nodes.auto.output);
  });

  it("fails on invalid input with every validation problem listed, and skips the rest", async () => {
    const r = await run({ amount: -5, currency: "USD" });
    expect(r.status).toBe("failed");
    expect(r.error).toBe("Validation failed (3 issues).");
    expect(r.nodes.check.details).toEqual([
      '"amount" must be at least 0.01',
      '"currency" must be one of: "GBP", "EUR"',
      '"description" is required',
    ]);
    for (const id of ["small", "auto", "manager", "ledger", "end"]) {
      expect(r.nodes[id]).toMatchObject({ status: "skipped", note: "not run because an earlier step failed" });
    }
    expect(r.events.at(-1)).toMatchObject({ level: "error", message: 'Run failed at "Validate".' });
  });

  it("reports type errors clearly", async () => {
    const r = await run({ ...validExpense, amount: "42" });
    expect(r.nodes.check.details).toEqual(['"amount" must be a number']);
  });

  it("is deterministic and does not mutate the input (reset and re-run gives identical results)", async () => {
    const input = structuredClone(validExpense);
    const a = await run(input);
    const b = await run(input);
    expect(a).toEqual(b);
    expect(input).toEqual(validExpense);
  });

  it("emits an ordered log", async () => {
    const r = await run(validExpense);
    expect(r.events.map((e) => e.seq)).toEqual(r.events.map((_, i) => i));
    expect(r.events[0].message).toBe("Run started: Test workflow");
    expect(r.events.at(-1)?.message).toBe("Run completed.");
    expect(r.events.some((e) => e.message === "Under £100? completed (amount lte 100 → true)")).toBe(true);
  });
});

describe("runWorkflow: invalid runs", () => {
  it("rejects non-object and oversized input", async () => {
    expect((await run([1, 2])).issues).toEqual(["Input must be a JSON object."]);
    expect((await run("text")).status).toBe("invalid");
    expect((await run({ blob: "x".repeat(200) }, { maxInputBytes: 100 })).issues).toEqual([
      "Input is too large (limit 100 characters).",
    ]);
  });

  it("rejects workflows that reference missing adapters before running anything", async () => {
    const r = await runWorkflow(expenseWorkflow, validExpense, { adapters: {} });
    expect(r.status).toBe("invalid");
    expect(r.issues).toContain('Node "manager" uses unknown adapter "approval".');
    expect(r.events).toEqual([]);
  });

  it("reports graph problems as invalid", async () => {
    const r = await runWorkflow({ id: "x" }, {}, {});
    expect(r.status).toBe("invalid");
    expect(r.issues?.length).toBeGreaterThan(0);
  });
});

describe("runWorkflow: adapter failures", () => {
  const wf = linear([trigger, { id: "call", type: "integration", label: "Call", config: { adapter: "x" } }, output()]);

  it("surfaces an adapter error", async () => {
    const r = await runWorkflow(wf, {}, { adapters: adapter(() => ({ ok: false, error: "Ledger rejected the entry." })) });
    expect(r).toMatchObject({ status: "failed", error: "Ledger rejected the entry." });
    expect(r.nodes.end.status).toBe("skipped");
  });

  it("hides internals when an adapter throws", async () => {
    const r = await runWorkflow(wf, {}, {
      adapters: adapter(() => {
        throw new Error("secret stack detail");
      }),
    });
    expect(r.error).toBe("Unexpected error in this step.");
    expect(JSON.stringify(r)).not.toContain("secret");
  });

  it("times out slow adapters", async () => {
    const r = await runWorkflow(wf, {}, { adapters: adapter(() => new Promise(() => {})), timeoutMs: 20 });
    expect(r.error).toBe("Step timed out after 20 ms.");
  });

  it("a step's own timeout overrides the run default, for slow local work like OCR", async () => {
    const slow = () => new Promise<{ ok: true; output: object }>((r) => setTimeout(() => r({ ok: true, output: {} }), 40));
    const patient = linear([
      trigger,
      { id: "call", type: "integration", label: "Call", config: { adapter: "x", timeoutMs: 500 } },
      output(),
    ]);
    expect((await runWorkflow(wf, {}, { adapters: adapter(slow as never), timeoutMs: 20 })).status).toBe("failed");
    expect((await runWorkflow(patient, {}, { adapters: adapter(slow as never), timeoutMs: 20 })).status).toBe("success");
  });

  it("rejects step timeouts outside 100 ms to 2 minutes", async () => {
    const bad = linear([trigger, { id: "call", type: "integration", label: "Call", config: { adapter: "x", timeoutMs: 600_000 } }, output()]);
    expect((await runWorkflow(bad, {}, { adapters: adapter(() => ({ ok: true, output: {} })) })).status).toBe("invalid");
  });

  it("rejects adapter output that is not an object", async () => {
    const r = await runWorkflow(wf, {}, { adapters: adapter(() => ({ ok: true, output: [] as never })) });
    expect(r.error).toBe("Adapter returned invalid data.");
  });
});

describe("node behaviour", () => {
  it("condition: 'any' matching, numeric type mismatch is false, 'in' and 'contains'", async () => {
    const cond = (rules: object[], match = "all") =>
      linear([trigger, { id: "c", type: "condition", label: "C", config: { match, rules } } as never, output()]);
    // A condition with only a "true" branch still needs that edge; build manually instead.
    const branchOf = async (rules: object[], input: object, match = "all") => {
      const def = cond(rules, match);
      def.edges = [
        { id: "a", source: "start", target: "c" },
        { id: "b", source: "c", target: "end", sourceHandle: "true" },
      ];
      return (await runWorkflow(def, input)).nodes.c.branch;
    };
    expect(await branchOf([{ field: "n", op: "gt", value: 10 }], { n: "100" })).toBe("false");
    expect(await branchOf([{ field: "n", op: "gt", value: 10 }, { field: "vip", op: "eq", value: true }], { n: 1, vip: true }, "any")).toBe("true");
    expect(await branchOf([{ field: "dept", op: "in", value: ["it", "hr"] }], { dept: "hr" })).toBe("true");
    expect(await branchOf([{ field: "subject", op: "contains", value: "URGENT" }], { subject: "urgent: server down" })).toBe("true");
    expect(await branchOf([{ field: "a.b", op: "notExists" }], { a: {} })).toBe("true");
  });

  it("transform: literal, from, template, lookup with default", async () => {
    const def = linear([
      trigger,
      {
        id: "t",
        type: "transform",
        label: "T",
        config: {
          assign: [
            { field: "ref", value: { template: "EXP-{{ id }} for {{who.name}}" } },
            { field: "copy", value: { from: "who.name" } },
            { field: "team", value: { lookup: { from: "dept", table: { fin: "Finance" }, default: "General" } } },
            { field: "other", value: { lookup: { from: "missing", table: { fin: "Finance" }, default: "General" } } },
            { field: "deep.flag", value: { literal: true } },
          ],
        },
      },
      output(),
    ]);
    const r = await runWorkflow(def, { id: 7, who: { name: "Ada" }, dept: "fin" });
    expect(r.output).toEqual({
      id: 7,
      who: { name: "Ada" },
      dept: "fin",
      ref: "EXP-7 for Ada",
      copy: "Ada",
      team: "Finance",
      other: "General",
      deep: { flag: true },
    });
  });

  it("lookup ignores inherited keys like 'constructor'", async () => {
    const def = linear([
      trigger,
      { id: "t", type: "transform", label: "T", config: { assign: [{ field: "x", value: { lookup: { from: "k", table: {}, default: "none" } } }] } },
      output(["x"]),
    ]);
    expect((await runWorkflow(def, { k: "constructor" })).output).toEqual({ x: "none" });
  });

  it("classify: most keyword hits wins, ties go to the first category, fallback otherwise", async () => {
    const def = linear([
      trigger,
      {
        id: "cl",
        type: "classify",
        label: "Categorise",
        config: {
          field: "body",
          into: "category",
          fallback: "General",
          categories: [
            { label: "Billing", keywords: ["invoice", "payment"] },
            { label: "IT", keywords: ["password", "laptop", "invoice"] },
          ],
        },
      },
      output(["category"]),
    ]);
    const cat = async (body: unknown) => (await runWorkflow(def, { body })).output?.category;
    expect(await cat("Invoice and payment overdue")).toBe("Billing");
    expect(await cat("Laptop password reset")).toBe("IT");
    expect(await cat("Invoice question")).toBe("Billing");
    expect(await cat("Hello there")).toBe("General");
    const bad = await runWorkflow(def, { body: 42 });
    expect(bad.error).toBe('"body" must be text to classify.');
  });

  it("validate: pattern and length rules, custom messages", async () => {
    const def = linear([
      trigger,
      {
        id: "v",
        type: "validate",
        label: "V",
        config: {
          rules: [
            { field: "email", pattern: "^[^@\\s]+@[^@\\s]+$", message: "Enter a valid email address" },
            { field: "tags", type: "array", max: 2 },
            { field: "note", type: "string", max: 5 },
          ],
        },
      },
      output(),
    ]);
    const r = await runWorkflow(def, { email: "nope", tags: [1, 2, 3], note: "too long" });
    expect(r.nodes.v.details).toEqual([
      "Enter a valid email address",
      '"tags" must be at most 2 items',
      '"note" must be at most 5 characters',
    ]);
    expect((await runWorkflow(def, {})).status).toBe("success"); // optional fields may be absent
  });
});
