"use client";

import { useMemo, useState, type FormEvent } from "react";
import { parseReviewValue, reviewItems, reviewReference, type Data, type NodeOf, type ReviewDecision } from "../engine";

const asText = (v: unknown) => (v === null || v === undefined ? "" : String(v));

/**
 * The visitor is the reviewer: each field with its confidence, flagged ones highlighted.
 * Values are checked here first so a typo doesn't fail the run; the engine checks them again.
 */
export function ReviewPanel({
  node,
  input,
  onDecide,
}: {
  node: NodeOf<"review">;
  input: Data;
  onDecide: (decision: ReviewDecision) => void;
}) {
  const items = useMemo(() => reviewItems(node, input), [node, input]);
  const reference = reviewReference(node, input);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((i) => [i.field, asText(i.value)])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const flaggedCount = items.filter((i) => i.flagged).length;
  const percent = Math.round(node.config.threshold * 100);

  function approve(e: FormEvent) {
    e.preventDefault();
    const problems: Record<string, string> = {};
    for (const item of items) {
      const r = parseReviewValue(item, values[item.field]);
      if (!r.ok) problems[item.field] = r.problem;
    }
    setErrors(problems);
    const first = items.find((i) => problems[i.field]);
    if (first) {
      document.getElementById(fieldId(first.field))?.focus();
      return;
    }
    onDecide({ action: "approve", values });
  }

  const box = "mt-1.5 h-11 w-full rounded-lg border bg-surface-solid px-3 text-[15px] text-fg";

  return (
    <form onSubmit={approve} noValidate className="space-y-4 text-sm">
      <div>
        <h3 className="font-semibold">Your turn: check the fields</h3>
        <p className="mt-1 text-xs leading-relaxed text-soft text-pretty">
          The run is paused. {flaggedCount} of {items.length} fields are flagged: read with under {percent}% confidence,
          or not found. Correct anything that&apos;s wrong, then confirm. This happens on your device.
        </p>
      </div>

      {reference && (
        <details className="rounded-xl border border-border bg-code">
          <summary className="min-h-10 cursor-pointer px-3 py-2.5 text-xs font-semibold">Show the document text</summary>
          <pre className="max-h-48 overflow-auto px-3 pb-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">{reference}</pre>
        </details>
      )}

      <ul className="space-y-2.5">
        {items.map((item) => {
          const id = fieldId(item.field);
          const error = errors[item.field];
          const conf =
            item.value === null
              ? "Not found"
              : item.confidence !== undefined
                ? `${Math.round(item.confidence * 100)}% confident`
                : "";
          return (
            <li
              key={item.field}
              className={`rounded-xl border p-3 ${item.flagged ? "border-[rgb(255_210_63/0.55)] bg-accent-soft" : "border-border"}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={id} className="font-medium">
                  {item.label}
                </label>
                <span id={`${id}-conf`} className={`font-mono text-[11px] ${item.flagged ? "text-accent" : "text-muted"}`}>
                  {conf}
                  {item.flagged && " · check"}
                </span>
              </div>
              {item.options ? (
                <select
                  id={id}
                  value={values[item.field]}
                  onChange={(e) => setValues((v) => ({ ...v, [item.field]: e.target.value }))}
                  aria-describedby={`${id}-conf`}
                  className={`${box} cursor-pointer border-border-strong`}
                >
                  <option value="">Not set</option>
                  {item.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={id}
                  type={item.kind === "date" ? "date" : "text"}
                  inputMode={item.kind === "number" ? "decimal" : undefined}
                  autoComplete="off"
                  spellCheck={false}
                  value={values[item.field]}
                  onChange={(e) => setValues((v) => ({ ...v, [item.field]: e.target.value }))}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={`${id}-conf${error ? ` ${id}-error` : ""}`}
                  className={`${box} ${error ? "border-danger" : "border-border-strong"}`}
                />
              )}
              {error && (
                <p id={`${id}-error`} className="mt-1.5 text-xs text-danger">
                  {error}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          className="tap inline-flex min-h-11 cursor-pointer items-center rounded-full bg-accent px-5 text-[15px] font-bold text-accent-fg"
        >
          Confirm and continue
        </button>
        <button
          type="button"
          onClick={() => onDecide({ action: "reject" })}
          className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-border-strong px-5 text-[15px] font-semibold transition-colors hover:bg-surface-2"
        >
          Reject document
        </button>
      </div>
    </form>
  );
}

const fieldId = (path: string) => `review-${path.replace(/\./g, "-")}`;
