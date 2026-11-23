import { runWorkflow, type Data } from "./engine";
import { documentProcessing } from "./workflows/document-processing";

/**
 * The home hero's run card: the invoice extraction workflow run on its "Clear invoice" sample.
 * Runs at build time (the home page is static), so every step, field and score shown is real engine output.
 */
export type HeroRun = {
  workflow: string;
  fileName: string;
  steps: { id: string; label: string; status: "success" | "skipped"; simulated: boolean }[];
  fields: { label: string; value: string; confidence: number }[];
  /** Index into `fields` of the figure the card marks (the total). */
  keyField: number;
  status: string;
};

const FIELDS: [key: string, label: string, kind: "text" | "date" | "money"][] = [
  ["supplier", "Supplier", "text"],
  ["invoiceNumber", "Invoice no.", "text"],
  ["invoiceDate", "Invoice date", "date"],
  ["dueDate", "Due date", "date"],
  ["net", "Net", "money"],
  ["vat", "VAT", "money"],
  ["total", "Total", "money"],
];

const SYMBOL: Record<string, string> = { GBP: "£", EUR: "€", USD: "$" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-03-04" → "4 Mar 2026". */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** 281.4 → "£281.40". */
export function formatMoney(value: number, currency: string): string {
  const [whole, pence] = value.toFixed(2).split(".");
  return `${SYMBOL[currency] ?? `${currency} `}${Number(whole).toLocaleString("en-GB")}.${pence}`;
}

export async function heroRun(): Promise<HeroRun> {
  const wf = documentProcessing;
  const sample = wf.samples.find((s) => s.id === "clean")!;
  const result = await runWorkflow(wf.definition, sample.input, { adapters: wf.adapters });
  if (result.status !== "success" || !result.output) throw new Error(`Hero run failed: ${result.error ?? result.status}`);

  const extracted = result.output.extracted as Data;
  const confidence = (result.nodes["extract-fields"].output!.extraction as Data).confidence as Data;
  const currency = String(extracted.currency);

  return {
    workflow: wf.definition.name,
    fileName: String(sample.input.fileName),
    steps: result.order.map((id) => {
      const n = result.nodes[id];
      return { id, label: n.label, status: n.status as "success" | "skipped", simulated: Boolean(n.simulated) };
    }),
    fields: FIELDS.map(([key, label, kind]) => {
      const v = extracted[key];
      const value = kind === "money" ? formatMoney(Number(v), currency) : kind === "date" ? formatDate(String(v)) : String(v);
      return { label, value, confidence: Number(confidence[key]) };
    }),
    keyField: FIELDS.findIndex(([key]) => key === "total"),
    status: String(result.output.status),
  };
}
