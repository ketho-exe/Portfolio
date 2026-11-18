import { describe, expect, it } from "vitest";
import { topologicalOrder, validateWorkflow } from "./graph";
import { WorkflowSchema } from "./schema";
import { expenseWorkflow, linear, output, trigger, workflow, type NodeDef } from "./test-fixtures";

const issuesOf = (def: unknown) => {
  const r = validateWorkflow(def);
  return r.ok ? [] : r.issues;
};

describe("validateWorkflow", () => {
  it("accepts a valid branching workflow", () => {
    expect(validateWorkflow(expenseWorkflow).ok).toBe(true);
  });

  it("rejects non-object definitions", () => {
    expect(validateWorkflow(null).ok).toBe(false);
    expect(validateWorkflow("workflow").ok).toBe(false);
  });

  it("requires exactly one trigger", () => {
    expect(issuesOf(linear([{ id: "a", type: "transform", label: "A", config: { assign: [{ field: "x", value: { literal: 1 } }] } }, output()])))
      .toContain("Expected exactly one trigger node, found 0.");
    expect(issuesOf(linear([trigger, { ...trigger, id: "start-2" }, output()]))).toContain(
      "Expected exactly one trigger node, found 2.",
    );
  });

  it("requires an output node", () => {
    expect(issuesOf(linear([trigger, { id: "v", type: "validate", label: "V", config: { rules: [{ field: "a", required: true }] } }])))
      .toContain("Expected at least one output node.");
  });

  it("rejects duplicate node ids", () => {
    expect(issuesOf(workflow([trigger, output(), output()], [{ id: "e", source: "start", target: "end" }]))).toContain(
      "Node ids must be unique.",
    );
  });

  it("rejects edges to unknown nodes and edges into the trigger", () => {
    const issues = issuesOf(
      workflow([trigger, output()], [
        { id: "e1", source: "start", target: "missing" },
        { id: "e2", source: "end", target: "start" },
      ]),
    );
    expect(issues).toContain('Edge "e1" ends at unknown node "missing".');
    expect(issues).toContain('Edge "e2" points into the trigger node.');
    expect(issues).toContain('Edge "e2" leaves an output node.');
  });

  it("requires branch handles on condition edges, and only there", () => {
    const cond: NodeDef = { id: "c", type: "condition", label: "C", config: { rules: [{ field: "a", op: "exists" }] } };
    const issues = issuesOf(
      workflow([trigger, cond, output()], [
        { id: "e1", source: "start", target: "c", sourceHandle: "true" },
        { id: "e2", source: "c", target: "end" },
      ]),
    );
    expect(issues).toContain('Edge "e1" has a branch handle but "start" is not a condition.');
    expect(issues).toContain('Edge "e2" leaves condition "c" without a "true"/"false" handle.');
  });

  it("rejects cycles", () => {
    const t = (id: string): NodeDef => ({ id, type: "transform", label: id, config: { assign: [{ field: "x", value: { literal: 1 } }] } });
    const issues = issuesOf(
      workflow([trigger, t("a"), t("b"), output()], [
        { id: "e1", source: "start", target: "a" },
        { id: "e2", source: "a", target: "b" },
        { id: "e3", source: "b", target: "a" },
        { id: "e4", source: "b", target: "end" },
      ]),
    );
    expect(issues).toEqual(["Workflow contains a cycle; loops are not supported."]);
  });

  it("rejects nodes unreachable from the trigger", () => {
    const issues = issuesOf(workflow([trigger, output(), { ...output(), id: "orphan" }], [{ id: "e", source: "start", target: "end" }]));
    expect(issues).toEqual(["Unreachable from the trigger: orphan."]);
  });

  it("rejects reserved path segments, bad regexes, unknown types and unknown keys", () => {
    const v = (rule: object) => linear([trigger, { id: "v", type: "validate", label: "V", config: { rules: [rule] } } as never, output()]);
    expect(issuesOf(v({ field: "__proto__.polluted", required: true })).join()).toMatch(/reserved segment/);
    expect(issuesOf(v({ field: "a", pattern: "([" })).join()).toMatch(/not a valid regular expression/);
    expect(issuesOf(v({ field: "a", script: "alert(1)" })).join()).toMatch(/Unrecognized key/i);
    expect(issuesOf(linear([trigger, { id: "h", type: "http", label: "H", config: {} } as never, output()])).length).toBeGreaterThan(0);
  });
});

describe("topologicalOrder", () => {
  it("is stable: ties follow definition order", () => {
    const wf = WorkflowSchema.parse(expenseWorkflow);
    expect(topologicalOrder(wf)).toEqual(["start", "check", "small", "auto", "manager", "ledger", "end"]);
  });
});
