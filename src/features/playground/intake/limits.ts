/** Limits for documents read in the browser. Generous for real invoices, small enough to stay quick on phones. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_PDF_PAGES = 5;
export const MAX_OCR_PAGES = 3;
export const MAX_TEXT_CHARS = 20_000;
export const MIN_READABLE_CHARS = 20;

export type DocumentKind = "pdf" | "image" | "text" | "email";

const byExtension: Record<string, DocumentKind> = {
  pdf: "pdf",
  png: "image",
  jpg: "image",
  jpeg: "image",
  webp: "image",
  txt: "text",
  eml: "email",
};

export function documentKind(name: string): DocumentKind | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return name.includes(".") ? (byExtension[ext] ?? null) : null;
}

/** Checks a file before anything reads it. Returns a message for the visitor, or null when it's fine. */
export function checkFile(file: { name: string; size: number }, allowed: DocumentKind[]): string | null {
  const kind = documentKind(file.name);
  if (!kind || !allowed.includes(kind)) {
    const names = allowed.map((k) => ({ pdf: "PDF", image: "PNG, JPG or WebP", text: "TXT", email: ".eml" })[k]);
    return `This file type isn't supported here. Use ${names.join(", ")}.`;
  }
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_FILE_BYTES) return `This file is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_FILE_BYTES)}.`;
  return null;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Same clean-up for every source: trim lines, collapse runs of spaces and blank lines, cap the length. */
export function normaliseText(raw: string): { text: string; truncated: boolean } {
  const lines = raw
    .replace(/\u0000/g, "")
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/[ \t]{2,}/g, "  "))
    .filter((l, i, all) => l !== "" || (i > 0 && all[i - 1] !== ""));
  const text = lines.join("\n").trim();
  return text.length > MAX_TEXT_CHARS ? { text: text.slice(0, MAX_TEXT_CHARS), truncated: true } : { text, truncated: false };
}

export const readableChars = (text: string) => text.replace(/\s/g, "").length;
