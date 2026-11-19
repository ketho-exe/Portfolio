import { z } from "zod";
import type { NodeResult } from "./nodes";
import { getPath, setPath } from "./path";
import type { Data, JsonValue, NodeOf } from "./schema";

/**
 * Human-in-the-loop review. A review node pauses the run; a person checks the listed fields,
 * corrects any that are wrong, then approves or rejects. `resumeWorkflow` applies the decision.
 */

export const ReviewDecisionSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("approve"), values: z.record(z.string(), z.json()).default({}) }),
  z.strictObject({ action: z.literal("reject"), reason: z.string().max(300).optional() }),
]);
export type ReviewDecision = z.input<typeof ReviewDecisionSchema>;

export type ReviewItem = {
  field: string;
  label: string;
  kind: "text" | "number" | "date";
  options?: string[];
  value: JsonValue;
  /** 0–1, when the data has a confidence for this field. */
  confidence?: number;
  /** Below the node's threshold, or missing: the reviewer should look at this one. */
  flagged: boolean;
};

/** What the reviewer sees: each field's current value and confidence. */
export function reviewItems(node: NodeOf<"review">, input: Data): ReviewItem[] {
  return node.config.fields.map((f) => {
    const value = getPath(input, f.field) ?? null;
    const c = f.confidence ? getPath(input, f.confidence) : undefined;
    const confidence = typeof c === "number" ? c : undefined;
    const flagged = confidence !== undefined ? confidence < node.config.threshold : value === null;
    return { field: f.field, label: f.label, kind: f.kind, options: f.options, value, confidence, flagged };
  });
}

/** The text the reviewer checks the fields against, if the node names one. */
export function reviewReference(node: NodeOf<"review">, input: Data): string | null {
  const ref = node.config.reference ? getPath(input, node.config.reference) : undefined;
  return typeof ref === "string" ? ref : null;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

type Parsed = { ok: true; value: JsonValue } | { ok: false; problem: string };

/** Turns a submitted value into the field's type. Blank means "not present" (null). The UI uses it to check input early. */
export function parseReviewValue(item: Pick<ReviewItem, "kind" | "label" | "options">, raw: JsonValue): Parsed {
  if (raw === null || (typeof raw === "string" && raw.trim() === "")) return { ok: true, value: null };
  const text = typeof raw === "string" ? raw.trim() : raw;

  if (item.kind === "number") {
    const n = typeof text === "number" ? text : typeof text === "string" ? Number(text.replace(/,/g, "")) : NaN;
    return Number.isFinite(n) ? { ok: true, value: n } : { ok: false, problem: `${item.label} must be a number` };
  }
  if (typeof text !== "string") return { ok: false, problem: `${item.label} must be text` };
  if (text.length > 200) return { ok: false, problem: `${item.label} is too long` };
  if (item.kind === "date" && !DATE.test(text)) return { ok: false, problem: `${item.label} must be a date (YYYY-MM-DD)` };
  if (item.options && !item.options.includes(text)) return { ok: false, problem: `${item.label} must be one of ${item.options.join(", ")}` };
  return { ok: true, value: text };
}

/** Applies a person's decision. Only the node's listed fields can change. */
export function applyReview(node: NodeOf<"review">, input: Data, decision: unknown): NodeResult {
  const parsed = ReviewDecisionSchema.safeParse(decision);
  if (!parsed.success) return { ok: false, error: "The review decision is not valid." };
  const d = parsed.data;
  const items = reviewItems(node, input);
  const flagged = items.filter((i) => i.flagged).map((i) => i.field);

  if (d.action === "reject") {
    return { ok: false, error: `Rejected in review${d.reason ? `: ${d.reason}` : "."}` };
  }

  const problems: string[] = [];
  const corrected: string[] = [];
  let output = input;
  for (const item of items) {
    if (!Object.hasOwn(d.values, item.field)) continue;
    const next = parseReviewValue(item, d.values[item.field]);
    if (!next.ok) {
      problems.push(next.problem);
      continue;
    }
    if (JSON.stringify(next.value) !== JSON.stringify(item.value)) {
      corrected.push(item.field);
      output = setPath(output, item.field, next.value);
    }
  }
  if (problems.length) return { ok: false, error: "Some reviewed values are not valid.", details: problems };

  const short = (path: string) => path.split(".").pop()!;
  output = setPath(output, node.config.into, {
    decision: "approved",
    checked: items.length,
    flagged: flagged.map(short),
    corrected: corrected.map(short),
  });
  return {
    ok: true,
    output,
    note: corrected.length
      ? `Approved with ${corrected.length} ${corrected.length === 1 ? "correction" : "corrections"}`
      : "Approved without changes",
  };
}
