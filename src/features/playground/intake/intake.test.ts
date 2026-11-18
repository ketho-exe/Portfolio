import { describe, expect, it } from "vitest";
import { localTextExtractionAdapter } from "../adapters/documents";
import { runWorkflow } from "../engine";
import { documentProcessing } from "../workflows/document-processing";
import { emailRouting } from "../workflows/email-routing";
import { toCsv } from "./csv";
import { decodeHeader, parseEml } from "./eml";
import { checkFile, documentKind, MAX_TEXT_CHARS, normaliseText } from "./limits";
import type { ReadResult } from "./read-document";

describe("file checks", () => {
  it("recognises kinds by extension, case-insensitively", () => {
    expect(documentKind("Invoice March.PDF")).toBe("pdf");
    expect(documentKind("scan.jpeg")).toBe("image");
    expect(documentKind("mail.eml")).toBe("email");
    expect(documentKind("archive.zip")).toBeNull();
    expect(documentKind("README")).toBeNull();
  });

  it("rejects wrong types, empty files and files over 10 MB", () => {
    const allowed = ["pdf", "image"] as const;
    expect(checkFile({ name: "a.pdf", size: 1000 }, [...allowed])).toBeNull();
    expect(checkFile({ name: "a.exe", size: 1000 }, [...allowed])).toMatch(/isn't supported/);
    expect(checkFile({ name: "a.eml", size: 1000 }, [...allowed])).toMatch(/Use PDF, PNG, JPG or WebP/);
    expect(checkFile({ name: "a.pdf", size: 0 }, [...allowed])).toBe("This file is empty.");
    expect(checkFile({ name: "a.pdf", size: 11 * 1024 * 1024 }, [...allowed])).toBe("This file is 11.0 MB. The limit is 10.0 MB.");
  });

  it("normalises text and caps its length", () => {
    expect(normaliseText("  a    b \r\n\r\n\r\n c ").text).toBe("a  b\n\nc");
    const long = normaliseText("x".repeat(MAX_TEXT_CHARS + 5));
    expect(long).toMatchObject({ truncated: true });
    expect(long.text.length).toBe(MAX_TEXT_CHARS);
  });
});

describe(".eml parsing", () => {
  it("reads a plain message with folded and encoded headers", () => {
    const raw = [
      'From: "Jo Patel" <jo.patel@example.com>',
      "Subject: =?UTF-8?B?V2F0ZXIgbGVhayDigJMgdXJnZW50?=",
      "  (kitchen)",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Water is coming through the ceiling.",
    ].join("\r\n");
    expect(parseEml(raw)).toEqual({
      from: "jo.patel@example.com",
      subject: "Water leak – urgent (kitchen)",
      body: "Water is coming through the ceiling.",
    });
  });

  it("decodes Q-encoded words in other charsets", () => {
    expect(decodeHeader("=?ISO-8859-1?Q?Caf=E9_invoice?=")).toBe("Café invoice");
    expect(decodeHeader("=?UTF-8?Q?a?= =?UTF-8?Q?b?=")).toBe("ab");
  });

  it("prefers text/plain in multipart mail and decodes quoted-printable", () => {
    const raw = [
      "From: billing@supplier.example",
      "Subject: Invoice overdue",
      'Content-Type: multipart/alternative; boundary="b1"',
      "",
      "--b1",
      "Content-Type: text/html; charset=utf-8",
      "",
      "<p>HTML version</p>",
      "--b1",
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: quoted-printable",
      "",
      "Invoice INV-1 for =C2=A3120.00 is overdue. This line is soft=",
      "-wrapped.",
      "--b1--",
    ].join("\n");
    expect(parseEml(raw).body).toBe("Invoice INV-1 for £120.00 is overdue. This line is soft-wrapped.");
  });

  it("falls back to HTML without tags, skips attachments, decodes base64", () => {
    const html = Buffer.from("<div>Hello<br>Please <b>reset</b> my password &amp; unlock</div>").toString("base64");
    const raw = [
      "From: a@example.com",
      "Subject: Help",
      'Content-Type: multipart/mixed; boundary="m"',
      "",
      "--m",
      'Content-Type: text/plain; name="notes.txt"',
      "Content-Disposition: attachment",
      "",
      "ATTACHMENT TEXT",
      "--m",
      "Content-Type: text/html; charset=utf-8",
      "Content-Transfer-Encoding: base64",
      "",
      html,
      "--m--",
    ].join("\n");
    expect(parseEml(raw).body).toBe("Hello\nPlease reset my password & unlock");
  });

  it("turns an uploaded .eml into workflow input that routes like the samples", async () => {
    const file = new File(
      ["From: <j.patel@example.com>\nSubject: Leak in kitchen\n\nWater through the ceiling, please come urgently."],
      "leak.eml",
    );
    const input = await emailRouting.upload!.toInput(file);
    const r = await runWorkflow(emailRouting.definition, input, { adapters: emailRouting.adapters });
    expect(r.output).toMatchObject({ category: "Facilities", priority: "Urgent", "ticket.priority": "P1" });
  });

  it("rejects files that aren't email", async () => {
    await expect(emailRouting.upload!.toInput(new File([""], "x.eml"))).rejects.toThrow(/doesn't look like an email/);
  });
});

describe("local document reading inside the workflow", () => {
  const fakeReader = (result: Partial<ReadResult> | Error) => async () => {
    if (result instanceof Error) throw result;
    return { text: "", method: "pdf-text", pages: 1, truncated: false, ...result } as ReadResult;
  };
  const run = async (reader: ReturnType<typeof fakeReader>, name = "Invoice 42.pdf") => {
    const file = new File(["%PDF-"], name);
    const input = await documentProcessing.upload!.toInput(file);
    const adapters = { ...documentProcessing.adapters, "document.extractText": localTextExtractionAdapter(file, reader) };
    return runWorkflow(documentProcessing.definition, input, { adapters });
  };

  it("runs the real pipeline on the extracted text and labels the step as on-device", async () => {
    const r = await run(fakeReader({ text: "Supplier: Acme Ltd\nInvoice number: A-100\nDate: 01/02/2026\nTotal due: £120.00" }));
    expect(r.status).toBe("success");
    expect(r.nodes["extract-text"]).toMatchObject({ status: "success", simulated: false });
    expect(r.nodes["extract-text"].note).toContain("via PDF text layer");
    expect(r.output).toMatchObject({ status: "Ready for approval", fileName: "Invoice 42.pdf" });
  });

  it("shows reader messages meant for visitors, hides anything else", async () => {
    const visitorError = Object.assign(new Error("This PDF is password-protected."), { name: "ReadError" });
    expect((await run(fakeReader(visitorError))).error).toBe("This PDF is password-protected.");
    expect((await run(fakeReader(new Error("internal stack detail")))).error).toBe("This document couldn't be read.");
  });

  it("fails clearly when the document has no readable text", async () => {
    const r = await run(fakeReader({ text: "  ~ " }));
    expect(r.error).toBe("No readable text found in Invoice 42.pdf.");
  });

  it("accepts real-world file names but still rejects unsupported types", async () => {
    const ok = await run(fakeReader({ text: "Supplier: Acme Ltd\nInvoice number: A-100\nDate: 2026-02-01\nTotal: £1.00" }), "Scan 03 (final).JPG");
    expect(ok.nodes["check-file"].status).toBe("success");
    const bad = await run(fakeReader({ text: "" }), "malware.exe");
    expect(bad.nodes["check-file"].status).toBe("error");
  });
});

describe("CSV download", () => {
  it("flattens nested results and escapes awkward values", () => {
    const csv = toCsv({ status: "Ready", extracted: { supplier: 'Acme, "The" Ltd', total: 12.5, vat: null }, note: "=HYPERLINK()" });
    expect(csv).toBe(
      'status,extracted.supplier,extracted.total,extracted.vat,note\r\nReady,"Acme, ""The"" Ltd",12.5,,\'=HYPERLINK()\r\n',
    );
  });
});
