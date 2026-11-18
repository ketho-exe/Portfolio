import type { Adapter, Data, JsonValue } from "../engine";
import { MIN_READABLE_CHARS, normaliseText, readableChars } from "../intake/limits";
import type { ReadProgress, ReadResult } from "../intake/read-document";

/**
 * Document adapters. Nothing leaves the browser and no AI model is called.
 * - Sample runs: the sample's text stands in for the document (simulated extraction).
 * - Uploads: PDF.js / Tesseract.js read the real file on the visitor's device.
 * - Field extraction is a real, deterministic rule-based parser in both cases.
 */

const unreadable = (fileName: unknown) => ({ ok: false as const, error: `No readable text found in ${String(fileName)}.` });

function withText(input: Data, text: string, extra: Data = {}) {
  const lineCount = text.split("\n").filter(Boolean).length;
  return { ok: true as const, output: { ...input, ...extra, text, lineCount }, note: `${lineCount} lines of text` };
}

/** Sample runs: the sample already contains the document's text, so extraction is simulated. */
export const textExtractionAdapter: Adapter = {
  id: "document.extractText",
  label: "Text extraction (sample text)",
  simulated: true,
  run(input: Data) {
    const { text } = normaliseText(typeof input.text === "string" ? input.text : "");
    return readableChars(text) < MIN_READABLE_CHARS ? unreadable(input.fileName) : withText(input, text);
  },
};

const methodLabel: Record<ReadResult["method"], string> = {
  "pdf-text": "PDF text layer",
  "pdf-ocr": "OCR of scanned PDF",
  "image-ocr": "OCR",
  "plain-text": "plain text",
};

/**
 * Uploads: reads the visitor's actual file on their device. `read` is injected so tests can
 * run without a browser; the UI passes `readDocument`.
 */
export function localTextExtractionAdapter(
  file: File,
  read: (file: File, onProgress: ReadProgress) => Promise<ReadResult>,
  onProgress: ReadProgress = () => {},
): Adapter {
  return {
    id: textExtractionAdapter.id,
    label: "Text extraction (on your device)",
    simulated: false,
    runsLocally: true,
    async run(input: Data) {
      let result: ReadResult;
      try {
        result = await read(file, onProgress);
      } catch (e) {
        // ReadError messages are written for visitors; anything else stays generic.
        const message = e instanceof Error && e.name === "ReadError" ? e.message : "This document couldn't be read.";
        return { ok: false, error: message };
      }
      if (readableChars(result.text) < MIN_READABLE_CHARS) return unreadable(input.fileName);
      const out = withText(input, result.text, {
        source: { method: methodLabel[result.method], pages: result.pages, truncated: result.truncated },
      });
      return { ...out, note: `${out.note} via ${methodLabel[result.method]}${result.truncated ? " (truncated)" : ""}` };
    },
  };
}

// ── Rule-based field extraction ───────────────────────────────────────────

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

/**
 * Reads invoice fields from text with labelled-field rules and scores its confidence in each.
 * Real and deterministic; it never invents a value it can't find. A production system might use
 * an AI model at this step; this one runs locally so documents never leave the device.
 */
export const fieldExtractionAdapter: Adapter = {
  id: "extract.invoiceFields",
  label: "Field extraction (rules)",
  simulated: false,
  runsLocally: true,
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
          method: "rules",
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
  [fieldExtractionAdapter.id]: fieldExtractionAdapter,
};
