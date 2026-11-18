import type { Adapter, Data, JsonValue } from "../engine";

/**
 * Simulated document adapters. Nothing leaves the browser and no model is called:
 * a deterministic parser stands in for AI extraction so every run gives the same result.
 */

const MIN_READABLE_CHARS = 20;

/** Stand-in for OCR / text-layer extraction: normalises the text and refuses documents with none. */
export const textExtractionAdapter: Adapter = {
  id: "document.extractText",
  label: "Text extraction (simulated)",
  simulated: true,
  run(input: Data) {
    const raw = typeof input.text === "string" ? input.text : "";
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim().replace(/\s{2,}/g, "  "))
      .filter((l, i, all) => l !== "" || (i > 0 && all[i - 1] !== ""));
    const text = lines.join("\n").trim();

    if (text.replace(/\s/g, "").length < MIN_READABLE_CHARS) {
      return { ok: false, error: `No readable text found in ${String(input.fileName)}.` };
    }
    const lineCount = text.split("\n").filter(Boolean).length;
    return { ok: true, output: { ...input, text, lineCount }, note: `${lineCount} lines of text` };
  },
};

// ── Mock AI extraction ────────────────────────────────────────────────────

/** Labelled values ("Total due: £12.00") score high; guesses from layout score lower. */
const LABELLED = 0.96;
const GUESSED = 0.7;
const WEAK_GUESS = 0.6;
const REVIEW_BELOW = 0.8;

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONEY = /([£€$])?\s?(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d+\.\d{2})/g;
const CURRENCY: Record<string, string> = { "£": "GBP", "€": "EUR", $: "USD" };

type Field = { value: JsonValue; confidence: number };
const found = (value: JsonValue, confidence: number): Field => ({ value, confidence });
const missing: Field = { value: null, confidence: 0 };

function iso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** First date in a string: 2026-03-04, 04/03/2026 (UK order) or 4 March 2026. */
export function parseDate(s: string): string | null {
  let m = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (m) return iso(+m[3], +m[2], +m[1]);
  m = s.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})\b/);
  if (m) {
    const month = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
    if (month >= 0) return iso(+m[3], month + 1, +m[1]);
  }
  return null;
}

function amounts(line: string): number[] {
  return [...line.matchAll(MONEY)].map((m) => Number(m[2].replace(/,/g, "")));
}

/** Last amount on the first line starting with `label`. */
function labelledAmount(lines: string[], label: RegExp): number | null {
  const line = lines.find((l) => label.test(l));
  const values = line ? amounts(line) : [];
  return values.length ? values[values.length - 1] : null;
}

export function extractInvoiceFields(text: string): Record<string, Field> {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const match = (re: RegExp) => {
    for (const l of lines) {
      const m = l.match(re);
      if (m) return m;
    }
    return null;
  };

  // Supplier: a "Supplier:"/"From:" label, otherwise the first line that isn't a document title.
  const supplierLabel = match(/^(?:supplier|from)\s*:\s*(.+)$/i);
  const firstLine = lines.find((l) => !/^(?:tax\s+)?invoice$|^delivery note$/i.test(l));
  const supplier = supplierLabel ? found(supplierLabel[1], LABELLED) : firstLine ? found(firstLine, GUESSED) : missing;

  const numberLabel = match(/^invoice\s*(?:no\.?|number|#)\s*:?\s*([A-Za-z0-9][\w-]{2,})/i);
  const numberRef = match(/^(?:ref|reference)\b\.?\s*:?\s*([A-Za-z0-9][\w-]{2,})/i);
  const invoiceNumber = numberLabel ? found(numberLabel[1], LABELLED) : numberRef ? found(numberRef[1], GUESSED) : missing;

  const dateLabel = match(/^(?:invoice\s+date|date)\s*:\s*(.+)$/i);
  const labelledDate = dateLabel ? parseDate(dateLabel[1]) : null;
  const anyDate = lines.filter((l) => !/^due\b/i.test(l)).map(parseDate).find(Boolean) ?? null;
  const invoiceDate = labelledDate ? found(labelledDate, LABELLED) : anyDate ? found(anyDate, GUESSED) : missing;

  const dueLabel = match(/^due(?:\s+date)?\s*:\s*(.+)$/i);
  const dueValue = dueLabel ? parseDate(dueLabel[1]) : null;
  const dueDate = dueValue ? found(dueValue, LABELLED) : missing;

  // Total: a total/amount-due line, otherwise the largest amount on the page (a weak guess).
  const totalLabelled = labelledAmount(lines, /^(?:total(?:\s+due)?|amount\s+due|balance\s+due)\b/i);
  const allAmounts = lines.flatMap(amounts);
  const total =
    totalLabelled !== null
      ? found(totalLabelled, LABELLED)
      : allAmounts.length
        ? found(Math.max(...allAmounts), WEAK_GUESS)
        : missing;

  const vatValue = labelledAmount(lines, /^vat\b/i);
  const netValue = labelledAmount(lines, /^(?:subtotal|net)\b/i);

  const symbol = text.match(/[£€$]/)?.[0];
  const code = text.match(/\b(GBP|EUR|USD)\b/)?.[1];
  const currency = symbol ? found(CURRENCY[symbol], LABELLED) : code ? found(code, LABELLED) : missing;

  return {
    supplier,
    invoiceNumber,
    invoiceDate,
    dueDate,
    currency,
    net: netValue === null ? missing : found(netValue, LABELLED),
    vat: vatValue === null ? missing : found(vatValue, LABELLED),
    total,
  };
}

const REQUIRED = ["supplier", "invoiceNumber", "invoiceDate", "total"] as const;

export const aiExtractionAdapter: Adapter = {
  id: "ai.extractInvoice",
  label: "AI extraction (simulated)",
  simulated: true,
  run(input: Data) {
    const text = typeof input.text === "string" ? input.text : "";
    const fields = extractInvoiceFields(text);

    const extracted: Data = {};
    const confidence: Data = {};
    for (const [k, f] of Object.entries(fields)) {
      extracted[k] = f.value;
      confidence[k] = f.confidence;
    }
    const lowestConfidence = Math.min(...REQUIRED.map((k) => fields[k].confidence));
    const lowFields = REQUIRED.filter((k) => fields[k].confidence < REVIEW_BELOW);
    const foundCount = Object.values(fields).filter((f) => f.value !== null).length;

    return {
      ok: true,
      output: {
        ...input,
        extracted,
        extraction: {
          model: "mock-extractor (simulated)",
          confidence,
          lowestConfidence,
          lowConfidenceFields: lowFields.length ? lowFields.join(", ") : "none",
        },
      },
      note: `Found ${foundCount} of ${Object.keys(fields).length} fields; lowest required confidence ${lowestConfidence}`,
    };
  },
};

export const documentAdapters = {
  [textExtractionAdapter.id]: textExtractionAdapter,
  [aiExtractionAdapter.id]: aiExtractionAdapter,
};
