import { describe, expect, it } from "vitest";
import { extractInvoiceFields, parseDate } from "../adapters/documents";
import { simulatedReference } from "../adapters/reference";
import { runWorkflow } from "../engine";
import { documentProcessing } from "./document-processing";
import { emailRouting } from "./email-routing";
import type { PlaygroundWorkflow } from "./types";

const runSample = (wf: PlaygroundWorkflow, id: string) => {
  const sample = wf.samples.find((s) => s.id === id)!;
  return runWorkflow(wf.definition, sample.input, { adapters: wf.adapters });
};
const runInput = (wf: PlaygroundWorkflow, input: Record<string, string>) =>
  runWorkflow(wf.definition, input, { adapters: wf.adapters });

describe("email routing specifics", () => {
  it("escalated path skips the standard queue and drafts a reply with the ticket reference", async () => {
    const r = await runSample(emailRouting, "urgent-leak");
    expect(r.nodes.standard.status).toBe("skipped");
    expect(r.nodes.ticket).toMatchObject({ status: "success", simulated: true });
    const ref = simulatedReference("SIM-TKT", "j.patel@example.com|Water leak in second floor kitchen");
    expect(r.output?.["ticket.reference"]).toBe(ref);
    expect(r.output?.reply).toBe(
      `Thanks for your email. Your request ${ref} is with Facilities team (P1, response within 4 hours).`,
    );
  });

  it("shows which keywords decided the category", async () => {
    const r = await runSample(emailRouting, "billing");
    expect(r.nodes.categorise.note).toBe('Matched "invoice", "payment", "overdue", "statement" → Billing');
  });

  it("the category with more keyword matches wins", async () => {
    const r = await runInput(emailRouting, {
      from: "a@example.com",
      subject: "Payslip question",
      body: "My payslip shows the wrong holiday pay. Is the invoice for training separate?",
    });
    expect(r.output?.category).toBe("HR"); // payslip + holiday (2) beats invoice (1)
  });

  it("blocked senders never get a ticket or a reply", async () => {
    const r = await runSample(emailRouting, "blocked");
    expect(r.error).toBe("Helpdesk rejected the message: bulk-mailer.example is on the blocked senders list.");
    expect(r.nodes.reply.status).toBe("skipped");
  });

  it("lists every problem with an invalid message", async () => {
    const r = await runSample(emailRouting, "invalid");
    expect(r.nodes.check.details).toEqual([
      '"from" must be an email address',
      '"subject" is required',
      '"body" must be at least 10 characters',
    ]);
  });
});

describe("invoice extraction specifics", () => {
  it("parses ISO, UK and long-form dates and rejects impossible ones", () => {
    expect(parseDate("2026-03-04")).toBe("2026-03-04");
    expect(parseDate("Paid 04/03/2026")).toBe("2026-03-04");
    expect(parseDate("Issued 3 March 2026")).toBe("2026-03-03");
    expect(parseDate("31/13/2026")).toBeNull();
    expect(parseDate("no date here")).toBeNull();
  });

  it("scores labelled fields higher than guesses", () => {
    const labelled = extractInvoiceFields("Supplier: Acme Ltd\nInvoice no: A-100\nDate: 01/02/2026\nTotal: £1,200.50");
    expect(labelled.total).toEqual({ value: 1200.5, confidence: 0.96 });
    expect(labelled.invoiceDate.value).toBe("2026-02-01");
    const guessed = extractInvoiceFields("Acme Ltd\nRef A-100\n1 Feb 2026\nWidgets £20.00\nPay £24.00");
    expect(guessed.supplier).toEqual({ value: "Acme Ltd", confidence: 0.7 });
    expect(guessed.total).toEqual({ value: 24, confidence: 0.6 });
  });

  it("missing fields are null with zero confidence, never invented", () => {
    const f = extractInvoiceFields("Just some notes about a meeting next week");
    expect(f.invoiceNumber).toEqual({ value: null, confidence: 0 });
    expect(f.total).toEqual({ value: null, confidence: 0 });
    expect(f.currency).toEqual({ value: null, confidence: 0 });
  });

  it("schema validation explains what is missing from a non-invoice", async () => {
    const r = await runSample(documentProcessing, "delivery-note");
    expect(r.nodes.schema.details).toEqual(["Invoice number not found", "Total not found", "Currency not recognised"]);
    expect(r.nodes.confident.status).toBe("skipped");
  });

  it("sample text extraction is labelled simulated; rule-based field extraction is real", async () => {
    const r = await runSample(documentProcessing, "clean");
    expect(r.nodes["extract-text"].simulated).toBe(true);
    expect(r.nodes["extract-fields"].simulated).toBe(false);
    expect(r.nodes.review.status).toBe("skipped");
  });

  it("unreadable documents stop before extraction", async () => {
    const r = await runSample(documentProcessing, "no-text");
    expect(r.error).toBe("No readable text found in scan-0413.jpg.");
    expect(r.nodes["extract-fields"].status).toBe("skipped");
  });
});
