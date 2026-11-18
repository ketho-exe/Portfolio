import type { Adapter, AdapterRegistry, WorkflowInput } from "./index";

type Nodes = WorkflowInput["nodes"];
export type NodeDef = Nodes[number];
type Edges = WorkflowInput["edges"];

export const workflow = (nodes: Nodes, edges: Edges): WorkflowInput => ({
  id: "test",
  name: "Test workflow",
  description: "Fixture",
  nodes,
  edges,
});

/** Chains nodes in order with plain edges. */
export const linear = (nodes: Nodes): WorkflowInput =>
  workflow(
    nodes,
    nodes.slice(1).map((n, i) => ({ id: `e${i}`, source: nodes[i].id, target: n.id })),
  );

export const trigger = { id: "start", type: "trigger", label: "Submit" } as const;
export const output = (pick?: string[]) => ({ id: "end", type: "output", label: "Result", config: { pick } }) as const;

/**
 * Small expense-approval graph covering validation, branching, a join and an adapter:
 * start → check → small? ─true→ auto ─┐
 *                        └false→ manager ─┴→ ledger → end
 */
export const expenseWorkflow: WorkflowInput = workflow(
  [
    trigger,
    {
      id: "check",
      type: "validate",
      label: "Validate",
      config: {
        rules: [
          { field: "amount", required: true, type: "number", min: 0.01 },
          { field: "currency", required: true, oneOf: ["GBP", "EUR"] },
          { field: "description", required: true, type: "string", min: 3 },
        ],
      },
    },
    { id: "small", type: "condition", label: "Under £100?", config: { rules: [{ field: "amount", op: "lte", value: 100 }] } },
    {
      id: "auto",
      type: "transform",
      label: "Auto-approve",
      config: { assign: [{ field: "approval.status", value: { literal: "approved" } }, { field: "approval.by", value: { literal: "policy" } }] },
    },
    { id: "manager", type: "integration", label: "Manager approval", config: { adapter: "approval", params: { limit: 1000 } } },
    { id: "ledger", type: "integration", label: "Accounting sync", config: { adapter: "ledger" } },
    output(["amount", "approval.status", "approval.by", "ledgerRef"]),
  ],
  [
    { id: "e1", source: "start", target: "check" },
    { id: "e2", source: "check", target: "small" },
    { id: "e3", source: "small", target: "auto", sourceHandle: "true" },
    { id: "e4", source: "small", target: "manager", sourceHandle: "false" },
    { id: "e5", source: "auto", target: "ledger" },
    { id: "e6", source: "manager", target: "ledger" },
    { id: "e7", source: "ledger", target: "end" },
  ],
);

export const mockAdapters: AdapterRegistry = {
  approval: {
    id: "approval",
    label: "Approval (simulated)",
    simulated: true,
    run: (input, params) => {
      const ok = typeof input.amount === "number" && typeof params.limit === "number" && input.amount <= params.limit;
      return { ok: true, output: { ...input, approval: { status: ok ? "approved" : "rejected", by: "manager" } } };
    },
  },
  ledger: {
    id: "ledger",
    label: "Ledger (simulated)",
    simulated: true,
    run: (input) => ({ ok: true, output: { ...input, ledgerRef: `LED-${String(input.amount)}` } }),
  },
};

export const adapter = (run: Adapter["run"]): AdapterRegistry => ({
  x: { id: "x", label: "Test adapter", simulated: true, run },
});

export const validExpense = { amount: 42.5, currency: "GBP", description: "Train ticket" };
