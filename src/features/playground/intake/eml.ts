/**
 * Minimal .eml (RFC 5322 / MIME) reader for the email routing demo. Runs locally on the visitor's device.
 * Handles unfolded headers, RFC 2047 encoded words, multipart bodies, base64 and quoted-printable,
 * and common charsets. Prefers text/plain; falls back to text/html with tags stripped.
 */
export type ParsedEmail = { from: string; subject: string; body: string };

type Part = { headers: Map<string, string>; body: string };

function splitHeaders(raw: string): Part {
  const text = raw.replace(/\r\n/g, "\n");
  const end = text.indexOf("\n\n");
  const head = end === -1 ? text : text.slice(0, end);
  const body = end === -1 ? "" : text.slice(end + 2);
  const headers = new Map<string, string>();
  let last = "";
  for (const line of head.split("\n")) {
    if (/^[ \t]/.test(line) && last) {
      headers.set(last, `${headers.get(last)} ${line.trim()}`);
      continue;
    }
    const i = line.indexOf(":");
    if (i <= 0) continue;
    last = line.slice(0, i).trim().toLowerCase();
    if (!headers.has(last)) headers.set(last, line.slice(i + 1).trim());
  }
  return { headers, body };
}

function param(header: string, name: string): string | undefined {
  const m = header.match(new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|([^;\\s]+))`, "i"));
  return m ? (m[1] ?? m[2]) : undefined;
}

function decodeBytes(bytes: Uint8Array, charset = "utf-8"): string {
  try {
    return new TextDecoder(charset.toLowerCase()).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

function base64Bytes(s: string): Uint8Array {
  const bin = atob(s.replace(/[^A-Za-z0-9+/=]/g, ""));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function quotedPrintableBytes(s: string, header = false): Uint8Array {
  const text = (header ? s.replace(/_/g, " ") : s).replace(/=\n/g, "");
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const hex = text.slice(i + 1, i + 3);
    if (text[i] === "=" && /^[0-9A-Fa-f]{2}$/.test(hex)) {
      out.push(parseInt(hex, 16));
      i += 2;
    } else {
      out.push(...new TextEncoder().encode(text[i]));
    }
  }
  return Uint8Array.from(out);
}

/** "=?UTF-8?B?...?=" and "=?ISO-8859-1?Q?...?=" words; whitespace between adjacent words is dropped. */
export function decodeHeader(value: string): string {
  return value
    .replace(/(=\?[^?]+\?[BbQq]\?[^?]*\?=)\s+(?==\?)/g, "$1")
    .replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, charset: string, enc: string, data: string) =>
      decodeBytes(enc.toUpperCase() === "B" ? base64Bytes(data) : quotedPrintableBytes(data, true), charset),
    );
}

function decodeBody(part: Part): string {
  const encoding = (part.headers.get("content-transfer-encoding") ?? "").toLowerCase();
  const charset = param(part.headers.get("content-type") ?? "", "charset") ?? "utf-8";
  if (encoding === "base64") return decodeBytes(base64Bytes(part.body), charset);
  if (encoding === "quoted-printable") return decodeBytes(quotedPrintableBytes(part.body), charset);
  return part.body;
}

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Depth-first search for the best body: text/plain wins over text/html. */
function findBody(part: Part, depth = 0): { type: "plain" | "html"; text: string } | null {
  const type = (part.headers.get("content-type") ?? "text/plain").toLowerCase();
  if (type.startsWith("multipart/") && depth < 5) {
    const boundary = param(part.headers.get("content-type") ?? "", "boundary");
    if (!boundary) return null;
    const pieces = part.body.replace(/\r\n/g, "\n").split(`--${boundary}`).slice(1);
    let html: { type: "html"; text: string } | null = null;
    for (const piece of pieces) {
      if (piece.startsWith("--")) break;
      const found = findBody(splitHeaders(piece.replace(/^\n/, "")), depth + 1);
      if (found?.type === "plain") return found;
      if (found?.type === "html" && !html) html = { type: "html", text: found.text };
    }
    return html;
  }
  if (/attachment/i.test(part.headers.get("content-disposition") ?? "")) return null;
  if (type.startsWith("text/html")) return { type: "html", text: htmlToText(decodeBody(part)) };
  if (type.startsWith("text/plain")) return { type: "plain", text: decodeBody(part) };
  return null;
}

export function parseEml(raw: string): ParsedEmail {
  const root = splitHeaders(raw);
  const fromHeader = decodeHeader(root.headers.get("from") ?? "");
  const from = fromHeader.match(/<([^>]+)>/)?.[1] ?? fromHeader.match(/[^\s<>"]+@[^\s<>"]+/)?.[0] ?? fromHeader;
  const body = (findBody(root)?.text ?? "")
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { from: from.trim(), subject: decodeHeader(root.headers.get("subject") ?? "").trim(), body };
}
