import type { Data, JsonValue } from "../engine";

/** Flattens nested objects to dotted keys: { a: { b: 1 } } → { "a.b": 1 }. Arrays become JSON text. */
export function flatten(data: Data, prefix = ""): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(data)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flatten(v as Data, key));
    else out[key] = Array.isArray(v) ? JSON.stringify(v) : (v as Exclude<JsonValue, object>);
  }
  return out;
}

const cell = (v: string | number | boolean | null) => {
  const s = v === null ? "" : String(v);
  // Quote when needed; prefix formula-like text so spreadsheets don't execute it (CSV injection).
  const safe = /^[=+\-@\t\r]/.test(s) && typeof v === "string" ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** One header row and one value row. */
export function toCsv(data: Data): string {
  const flat = flatten(data);
  const keys = Object.keys(flat);
  return `${keys.map(cell).join(",")}\r\n${keys.map((k) => cell(flat[k])).join(",")}\r\n`;
}
