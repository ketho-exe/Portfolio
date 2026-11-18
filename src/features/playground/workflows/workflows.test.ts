import { describe, expect, it } from "vitest";
import { simulatedReference } from "../adapters/reference";
import { runWorkflow, validateWorkflow } from "../engine";
import { expenseApproval } from "./expense-approval";
import { workflows } from "./index";

// Generic guarantees for every playground workflow: valid graph, simulated-only adapters,
// and every sample input does exactly what its label claims.
describe.each(workflows.map((w) => [w.definition.name, w] as const))("%s", (_, wf) => {
  it("is a valid workflow", () => {
    const r = validateWorkflow(wf.definition);
    expect(r.ok ? [] : r.issues).toEqual([]);
  });

  it("only uses simulated adapters in the browser", () => {
    for (const adapter of Object.values(wf.adapters)) expect(adapter.simulated).toBe(true);
  });

  it("has unique sample ids", () => {
    const ids = wf.samples.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(wf.samples.map((s) => [s.label, s] as const))("sample \"%s\" behaves as labelled", async (_, sample) => {
    const r = await runWorkflow(wf.definition, sample.input, { adapters: wf.adapters });
    expect(r.status).toBe(sample.expected.status);
    if (sample.expected.failsAt) {
      expect(r.nodes[sample.expected.failsAt].status).toBe("error");
    }
    if (sample.expected.output) expect(r.output).toMatchObject(sample.expected.output);
  });
});

describe("expense approval specifics", () => {
  const run = (sampleId: string) => {
    const sample = expenseApproval.samples.find((s) => s.id === sampleId)!;
    return runWorkflow(expenseApproval.definition, sample.input, { adapters: expenseApproval.adapters });
  };

  it("auto-approved path skips the manager and the return branch", async () => {
    const r = await run("auto");
    expect(r.nodes.manager.status).toBe("skipped");
    expect(r.nodes.return.status).toBe("skipped");
    expect(r.nodes.post).toMatchObject({ status: "success", simulated: true });
    expect(r.nodes.categorise.output?.ledgerDescription).toBe("Rail operator: Sam Taylor (TX-1042)");
    expect(r.output?.["accounting.reference"]).toBe(simulatedReference("SIM-SPEND", "TX-1042"));
  });

  it("rejected path never reaches accounting", async () => {
    const r = await run("over-limit");
    expect(r.nodes.post.status).toBe("skipped");
    expect(r.output?.["approval.reason"]).toBe("Exceeds the £1000 approver limit; needs finance sign-off");
  });

  it("lists every problem with an invalid submission", async () => {
    const r = await run("invalid");
    expect(r.nodes.validate.details).toEqual([
      '"id" must look like TX-1234',
      '"department" must be one of: "Operations", "Finance", "Facilities", "Marketing"',
      '"merchant" is required',
      '"amount" must be at least 0.01',
      "Only GBP transactions are supported in this demo",
      '"date" must be YYYY-MM-DD',
      '"receiptAttached" is required',
    ]);
    expect(r.nodes.categorise.status).toBe("skipped");
  });

  it("explains the accounting failure", async () => {
    const r = await run("locked-period");
    expect(r.error).toBe(
      "Accounting system rejected the transaction: 2025-12-15 is before the period lock date (2026-01-01).",
    );
    expect(r.nodes.result.status).toBe("skipped");
  });

  it("unknown categories fall back to the general expenses code", async () => {
    // Run the categorise step on its own, so validation's category list doesn't block an unknown value.
    const nodes = expenseApproval.definition.nodes;
    const mini = {
      ...expenseApproval.definition,
      nodes: [nodes.find((n) => n.id === "submit")!, nodes.find((n) => n.id === "categorise")!, { id: "out", type: "output", label: "Out" }],
      edges: [
        { id: "a", source: "submit", target: "categorise" },
        { id: "b", source: "categorise", target: "out" },
      ],
    };
    const r = await runWorkflow(mini, { category: "Training", merchant: "M", cardholder: "C", id: "TX-1" });
    expect(r.output?.accountCode).toBe("429");
  });
});

describe("simulatedReference", () => {
  it("is deterministic and differs per seed", () => {
    expect(simulatedReference("SIM", "TX-1")).toBe(simulatedReference("SIM", "TX-1"));
    expect(simulatedReference("SIM", "TX-1")).not.toBe(simulatedReference("SIM", "TX-2"));
    expect(simulatedReference("SIM", "TX-1")).toMatch(/^SIM-[0-9A-F]{6}$/);
  });
});
