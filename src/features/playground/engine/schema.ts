import { z } from "zod";

/**
 * Workflow definition format. Pure data: no functions, no code strings, no URLs.
 * Every node `type` has its own strictly-typed `config` (discriminated union).
 */

const FORBIDDEN_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);

/** Dot path into the data object, e.g. "amount" or "submitter.department". */
export const PathSchema = z
  .string()
  .regex(/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/, "must be a dot path like 'a.b'")
  .refine((p) => p.split(".").every((s) => !FORBIDDEN_SEGMENTS.has(s)), "uses a reserved segment");

export type JsonValue = z.infer<ReturnType<typeof z.json>>;
export type Data = Record<string, JsonValue>;

const Json = z.json();

// ── Node configs ──────────────────────────────────────────────────────────

const TriggerConfig = z.strictObject({});

const ValidationRule = z.strictObject({
  field: PathSchema,
  required: z.boolean().optional(),
  type: z.enum(["string", "number", "boolean", "array", "object"]).optional(),
  /** Number value, or string/array length. */
  min: z.number().optional(),
  max: z.number().optional(),
  /** Regex source, authored by us (never by visitors). */
  pattern: z
    .string()
    .max(200)
    .refine((p) => {
      try {
        new RegExp(p);
        return true;
      } catch {
        return false;
      }
    }, "is not a valid regular expression")
    .optional(),
  oneOf: z.array(Json).optional(),
  message: z.string().optional(),
});
export type ValidationRule = z.infer<typeof ValidationRule>;

const ValidateConfig = z.strictObject({ rules: z.array(ValidationRule).min(1) });

const Comparison = z.strictObject({
  field: PathSchema,
  op: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in", "notIn", "contains", "exists", "notExists"]),
  value: Json.optional(),
});
export type Comparison = z.infer<typeof Comparison>;

const ConditionConfig = z.strictObject({
  match: z.enum(["all", "any"]).default("all"),
  rules: z.array(Comparison).min(1),
});

const ValueSpec = z.union([
  z.strictObject({ literal: Json }),
  z.strictObject({ from: PathSchema }),
  /** "Expense {{id}} approved" — placeholders are dot paths. */
  z.strictObject({ template: z.string() }),
  z.strictObject({
    lookup: z.strictObject({ from: PathSchema, table: z.record(z.string(), Json), default: Json.optional() }),
  }),
]);
export type ValueSpec = z.infer<typeof ValueSpec>;

const TransformConfig = z.strictObject({
  assign: z.array(z.strictObject({ field: PathSchema, value: ValueSpec })).min(1),
});

const ClassifyConfig = z.strictObject({
  /** Text field to classify. */
  field: PathSchema,
  /** Where to write the winning label. */
  into: PathSchema,
  categories: z
    .array(z.strictObject({ label: z.string().min(1), keywords: z.array(z.string().min(1)).min(1) }))
    .min(1),
  fallback: z.string().min(1),
});

const IntegrationConfig = z.strictObject({
  /** Adapter id from the adapter registry passed to `runWorkflow`. */
  adapter: z.string().min(1),
  params: z.record(z.string(), Json).default({}),
  /** Overrides the run's per-step timeout, for slow local work such as OCR. */
  timeoutMs: z.number().int().min(100).max(120_000).optional(),
});

/** A person checks (and may correct) these fields before the run continues. */
const ReviewField = z.strictObject({
  field: PathSchema,
  label: z.string().min(1),
  kind: z.enum(["text", "number", "date"]).default("text"),
  /** Allowed values; the reviewer picks one. */
  options: z.array(z.string().min(1)).min(1).max(20).optional(),
  /** Where the 0–1 confidence for this field is, if the data has one. */
  confidence: PathSchema.optional(),
});

const ReviewConfig = z.strictObject({
  fields: z.array(ReviewField).min(1).max(20),
  /** Fields with confidence below this are flagged for the reviewer. */
  threshold: z.number().min(0).max(1).default(0.8),
  /** Shown to the reviewer for reference (for example the document's text). */
  reference: PathSchema.optional(),
  /** Where the decision is recorded. */
  into: PathSchema.default("review"),
});

const OutputConfig = z.strictObject({ pick: z.array(PathSchema).optional() });

// ── Nodes and edges ───────────────────────────────────────────────────────

const base = {
  id: z.string().regex(/^[a-z0-9-]+$/, "use lowercase letters, digits and dashes"),
  label: z.string().min(1),
  description: z.string().optional(),
};

export const NodeSchema = z.discriminatedUnion("type", [
  z.strictObject({ ...base, type: z.literal("trigger"), config: TriggerConfig.default({}) }),
  z.strictObject({ ...base, type: z.literal("validate"), config: ValidateConfig }),
  z.strictObject({ ...base, type: z.literal("condition"), config: ConditionConfig }),
  z.strictObject({ ...base, type: z.literal("transform"), config: TransformConfig }),
  z.strictObject({ ...base, type: z.literal("classify"), config: ClassifyConfig }),
  z.strictObject({ ...base, type: z.literal("integration"), config: IntegrationConfig }),
  z.strictObject({ ...base, type: z.literal("review"), config: ReviewConfig }),
  z.strictObject({ ...base, type: z.literal("output"), config: OutputConfig.default({}) }),
]);

export const EdgeSchema = z.strictObject({
  id: z.string().min(1),
  source: z.string(),
  target: z.string(),
  /** Required on edges leaving a condition node: which branch this edge carries. */
  sourceHandle: z.enum(["true", "false"]).optional(),
});

export const WorkflowSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  nodes: z.array(NodeSchema).min(2).max(50),
  edges: z.array(EdgeSchema).max(100),
});

/** Authoring type (defaults optional). */
export type WorkflowInput = z.input<typeof WorkflowSchema>;
/** Validated type (defaults applied). */
export type Workflow = z.output<typeof WorkflowSchema>;
export type WorkflowNode = Workflow["nodes"][number];
export type NodeType = WorkflowNode["type"];
export type WorkflowEdge = Workflow["edges"][number];
export type NodeOf<T extends NodeType> = Extract<WorkflowNode, { type: T }>;
