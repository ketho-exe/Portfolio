import { getPath, setPath } from "./path";
import type { Comparison, Data, JsonValue, NodeOf, ValidationRule, ValueSpec, WorkflowNode } from "./schema";

export type NodeResult =
  | { ok: true; output: Data; branch?: "true" | "false"; note?: string }
  | { ok: false; error: string; details?: string[] };

/**
 * Integration adapter. In the browser an adapter is either a deterministic mock (`simulated: true`)
 * or real work that runs entirely on the visitor's device (`runsLocally: true`, e.g. PDF text or OCR)
 * and makes no network requests beyond fetching this site's own assets.
 * An adapter for an external service would call a server endpoint; it must never hold credentials in the browser.
 */
export type Adapter = {
  id: string;
  label: string;
  simulated: boolean;
  runsLocally?: boolean;
  run(input: Data, params: Data): NodeResult | Promise<NodeResult>;
};
export type AdapterRegistry = Record<string, Adapter>;

export async function executeNode(node: WorkflowNode, input: Data, adapters: AdapterRegistry): Promise<NodeResult> {
  switch (node.type) {
    case "trigger":
      return { ok: true, output: input };
    case "validate":
      return runValidate(node, input);
    case "condition":
      return runCondition(node, input);
    case "transform":
      return runTransform(node, input);
    case "classify":
      return runClassify(node, input);
    case "integration":
      return runIntegration(node, input, adapters);
    case "output":
      return runOutput(node, input);
  }
}

// ── validate ──────────────────────────────────────────────────────────────

function runValidate(node: NodeOf<"validate">, input: Data): NodeResult {
  const problems = node.config.rules.map((r) => checkRule(r, getPath(input, r.field))).filter((p) => p !== null);
  if (problems.length) {
    return { ok: false, error: `Validation failed (${problems.length} ${plural(problems.length, "issue")}).`, details: problems };
  }
  return { ok: true, output: input, note: `${node.config.rules.length} ${plural(node.config.rules.length, "check")} passed` };
}

function checkRule(rule: ValidationRule, value: JsonValue | undefined): string | null {
  const fail = (msg: string) => rule.message ?? `"${rule.field}" ${msg}`;

  if (value === undefined || value === null || value === "") {
    return rule.required ? fail("is required") : null;
  }
  if (rule.type && typeOf(value) !== rule.type) return fail(`must be ${article(rule.type)} ${rule.type}`);

  const size = typeof value === "number" ? value : typeof value === "string" || Array.isArray(value) ? value.length : null;
  const unit = typeof value === "string" ? " characters" : Array.isArray(value) ? " items" : "";
  if (size !== null && rule.min !== undefined && size < rule.min) return fail(`must be at least ${rule.min}${unit}`);
  if (size !== null && rule.max !== undefined && size > rule.max) return fail(`must be at most ${rule.max}${unit}`);

  if (rule.pattern !== undefined && (typeof value !== "string" || !new RegExp(rule.pattern).test(value))) {
    return fail("has an invalid format");
  }
  if (rule.oneOf && !rule.oneOf.some((o) => deepEqual(o, value))) {
    return fail(`must be one of: ${rule.oneOf.map((o) => JSON.stringify(o)).join(", ")}`);
  }
  return null;
}

// ── condition ─────────────────────────────────────────────────────────────

function runCondition(node: NodeOf<"condition">, input: Data): NodeResult {
  const results = node.config.rules.map((r) => compare(r, getPath(input, r.field)));
  const passed = node.config.match === "all" ? results.every(Boolean) : results.some(Boolean);
  const described = node.config.rules
    .map((r) => `${r.field} ${r.op}${r.value === undefined ? "" : ` ${JSON.stringify(r.value)}`}`)
    .join(node.config.match === "all" ? " AND " : " OR ");
  return { ok: true, output: input, branch: passed ? "true" : "false", note: `${described} → ${passed}` };
}

function compare(rule: Comparison, actual: JsonValue | undefined): boolean {
  const expected = rule.value;
  switch (rule.op) {
    case "exists":
      return actual !== undefined && actual !== null;
    case "notExists":
      return actual === undefined || actual === null;
    case "eq":
      return deepEqual(actual, expected);
    case "neq":
      return !deepEqual(actual, expected);
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      // Numbers only: a type mismatch is "false", never a coercion.
      if (typeof actual !== "number" || typeof expected !== "number") return false;
      if (rule.op === "gt") return actual > expected;
      if (rule.op === "gte") return actual >= expected;
      if (rule.op === "lt") return actual < expected;
      return actual <= expected;
    }
    case "in":
    case "notIn": {
      const hit = Array.isArray(expected) && expected.some((e) => deepEqual(e, actual));
      return rule.op === "in" ? hit : !hit;
    }
    case "contains":
      if (typeof actual === "string" && typeof expected === "string") {
        return actual.toLowerCase().includes(expected.toLowerCase());
      }
      return Array.isArray(actual) && actual.some((a) => deepEqual(a, expected));
  }
}

// ── transform ─────────────────────────────────────────────────────────────

function runTransform(node: NodeOf<"transform">, input: Data): NodeResult {
  // Assignments apply in order, so later ones can read earlier results.
  let output = input;
  for (const { field, value } of node.config.assign) output = setPath(output, field, resolveValue(value, output));
  return { ok: true, output, note: `Set ${node.config.assign.map((a) => a.field).join(", ")}` };
}

function resolveValue(spec: ValueSpec, data: Data): JsonValue {
  if ("literal" in spec) return spec.literal;
  if ("from" in spec) return getPath(data, spec.from) ?? null;
  if ("template" in spec) {
    return spec.template.replace(/\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g, (_, path: string) => {
      const v = getPath(data, path);
      return v === undefined || v === null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    });
  }
  const key = String(getPath(data, spec.lookup.from) ?? "");
  return Object.hasOwn(spec.lookup.table, key) ? spec.lookup.table[key] : (spec.lookup.default ?? null);
}

// ── classify ──────────────────────────────────────────────────────────────

function runClassify(node: NodeOf<"classify">, input: Data): NodeResult {
  const { field, into, categories, fallback } = node.config;
  const text = getPath(input, field);
  if (typeof text !== "string") return { ok: false, error: `"${field}" must be text to classify.` };

  const haystack = text.toLowerCase();
  let best: { label: string; matched: string[] } | null = null;
  for (const c of categories) {
    const matched = c.keywords.filter((k) => haystack.includes(k.toLowerCase()));
    // Highest keyword count wins; ties go to the category listed first.
    if (matched.length && (!best || matched.length > best.matched.length)) best = { label: c.label, matched };
  }

  const label = best?.label ?? fallback;
  const note = best
    ? `Matched ${best.matched.map((k) => `"${k}"`).join(", ")} → ${label}`
    : `No keywords matched → ${label}`;
  return { ok: true, output: setPath(input, into, label), note };
}

// ── integration ───────────────────────────────────────────────────────────

async function runIntegration(node: NodeOf<"integration">, input: Data, adapters: AdapterRegistry): Promise<NodeResult> {
  const adapter = Object.hasOwn(adapters, node.config.adapter) ? adapters[node.config.adapter] : undefined;
  if (!adapter) return { ok: false, error: `Unknown adapter "${node.config.adapter}".` };
  const result = await adapter.run(input, node.config.params);
  if (result.ok && !isPlainObject(result.output)) return { ok: false, error: "Adapter returned invalid data." };
  return result;
}

// ── output ────────────────────────────────────────────────────────────────

function runOutput(node: NodeOf<"output">, input: Data): NodeResult {
  if (!node.config.pick) return { ok: true, output: input };
  const output: Data = {};
  for (const path of node.config.pick) output[path] = getPath(input, path) ?? null;
  return { ok: true, output };
}

// ── helpers ───────────────────────────────────────────────────────────────

function typeOf(v: JsonValue): string {
  return Array.isArray(v) ? "array" : v === null ? "null" : typeof v;
}

function isPlainObject(v: unknown): v is Data {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return (
    ka.length === kb.length &&
    ka.every((k) => Object.hasOwn(b, k) && deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
  );
}

const plural = (n: number, word: string) => (n === 1 ? word : `${word}s`);
const article = (word: string) => (/^[aeiou]/.test(word) ? "an" : "a");
