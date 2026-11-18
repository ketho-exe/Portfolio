import { documentAdapters } from "../adapters/documents";
import type { PlaygroundWorkflow } from "./types";

/**
 * Invoice intake with mocked AI extraction (a recreation of OCR document intake work).
 * Synthetic documents; text extraction and AI extraction are simulated, deterministic adapters.
 *
 * receive → check-file → extract-text → ai-extract → schema → confident? ─true→ queue ──┐
 *                                                                        └false→ review ─┴→ result
 */
export const documentProcessing: PlaygroundWorkflow = {
  definition: {
    id: "document-processing",
    name: "Invoice extraction",
    description:
      "A supplier invoice is checked, its text extracted, and its fields pulled out by a mocked AI step with a confidence score for each. The result is validated against a schema, then queued for approval or sent to a person to review.",
    nodes: [
      {
        id: "receive",
        type: "trigger",
        label: "Document received",
        description: "A document arrives by email, upload or scanner.",
      },
      {
        id: "check-file",
        type: "validate",
        label: "Check file",
        description: "Only supported file types and intake channels are accepted.",
        config: {
          rules: [
            {
              field: "fileName",
              required: true,
              pattern: "^[\\w.-]+\\.(pdf|png|jpe?g|txt)$",
              message: '"fileName" must be a PDF, PNG, JPG or TXT file',
            },
            { field: "receivedVia", required: true, oneOf: ["email", "upload", "scanner"] },
            { field: "text", type: "string", max: 6000 },
          ],
        },
      },
      {
        id: "extract-text",
        type: "integration",
        label: "Extract text",
        description: "Simulated OCR / text-layer extraction. In this demo the document's text is part of the input.",
        config: { adapter: "document.extractText" },
      },
      {
        id: "ai-extract",
        type: "integration",
        label: "AI field extraction",
        description:
          "Simulated: a deterministic parser stands in for a language model, so results repeat and nothing leaves your browser. Each field gets a confidence score.",
        config: { adapter: "ai.extractInvoice" },
      },
      {
        id: "schema",
        type: "validate",
        label: "Validate against schema",
        description: "Extracted data must have the required fields in the right format before it can be used.",
        config: {
          rules: [
            { field: "extracted.supplier", required: true, type: "string", min: 2, message: "Supplier name not found" },
            { field: "extracted.invoiceNumber", required: true, type: "string", message: "Invoice number not found" },
            {
              field: "extracted.invoiceDate",
              required: true,
              pattern: "^\\d{4}-\\d{2}-\\d{2}$",
              message: "Invoice date not found or not a valid date",
            },
            { field: "extracted.dueDate", pattern: "^\\d{4}-\\d{2}-\\d{2}$", message: "Due date is not a valid date" },
            { field: "extracted.total", required: true, type: "number", min: 0.01, message: "Total not found" },
            { field: "extracted.vat", type: "number", min: 0 },
            { field: "extracted.currency", required: true, oneOf: ["GBP", "EUR", "USD"], message: "Currency not recognised" },
          ],
        },
      },
      {
        id: "confident",
        type: "condition",
        label: "Confident enough?",
        description: "Every required field must have been read with at least 0.8 confidence.",
        config: { rules: [{ field: "extraction.lowestConfidence", op: "gte", value: 0.8 }] },
      },
      {
        id: "queue",
        type: "transform",
        label: "Queue for approval",
        config: {
          assign: [
            { field: "status", value: { literal: "Ready for approval" } },
            {
              field: "nextStep",
              value: { template: "Send {{extracted.invoiceNumber}} from {{extracted.supplier}} to the approval workflow" },
            },
          ],
        },
      },
      {
        id: "review",
        type: "transform",
        label: "Send to human review",
        config: {
          assign: [
            { field: "status", value: { literal: "Needs human review" } },
            { field: "nextStep", value: { template: "Check low-confidence fields: {{extraction.lowConfidenceFields}}" } },
          ],
        },
      },
      {
        id: "result",
        type: "output",
        label: "Structured result",
        config: { pick: ["fileName", "status", "nextStep", "extracted", "extraction.lowestConfidence"] },
      },
    ],
    edges: [
      { id: "receive-check", source: "receive", target: "check-file" },
      { id: "check-extract", source: "check-file", target: "extract-text" },
      { id: "extract-ai", source: "extract-text", target: "ai-extract" },
      { id: "ai-schema", source: "ai-extract", target: "schema" },
      { id: "schema-confident", source: "schema", target: "confident" },
      { id: "confident-queue", source: "confident", target: "queue", sourceHandle: "true" },
      { id: "confident-review", source: "confident", target: "review", sourceHandle: "false" },
      { id: "queue-result", source: "queue", target: "result" },
      { id: "review-result", source: "review", target: "result" },
    ],
  },

  adapters: documentAdapters,

  samples: [
    {
      id: "clean",
      label: "Clear invoice",
      description: "A well-labelled invoice. Every field is read with high confidence, so it's queued for approval.",
      input: {
        fileName: "brightline-inv-20431.pdf",
        receivedVia: "email",
        text: [
          "INVOICE",
          "Supplier: Brightline Office Supplies Ltd",
          "Invoice number: INV-20431",
          "Invoice date: 2026-03-04",
          "Due date: 2026-04-03",
          "",
          "Printer paper (10 boxes)      £185.00",
          "Toner cartridges (2)          £96.40",
          "Subtotal: £281.40",
          "VAT (20%): £56.28",
          "Total due: £337.68",
        ].join("\n"),
      },
      expected: {
        status: "success",
        output: {
          status: "Ready for approval",
          extracted: {
            supplier: "Brightline Office Supplies Ltd",
            invoiceNumber: "INV-20431",
            invoiceDate: "2026-03-04",
            dueDate: "2026-04-03",
            currency: "GBP",
            net: 281.4,
            vat: 56.28,
            total: 337.68,
          },
        },
      },
    },
    {
      id: "low-confidence",
      label: "Unclear layout",
      description: "No field labels, so supplier, reference, date and total are guesses. It goes to a person to check.",
      input: {
        fileName: "scan-0412.png",
        receivedVia: "scanner",
        text: [
          "Northgate Cleaning Services",
          "Unit 4, Example Park",
          "",
          "Ref 88213",
          "Issued 3 March 2026",
          "",
          "Office cleaning, February     £420.00",
          "VAT                           £84.00",
          "Amount payable                £504.00",
        ].join("\n"),
      },
      expected: {
        status: "success",
        output: {
          status: "Needs human review",
          nextStep: "Check low-confidence fields: supplier, invoiceNumber, invoiceDate, total",
          extracted: { supplier: "Northgate Cleaning Services", invoiceNumber: "88213", invoiceDate: "2026-03-03", total: 504 },
        },
      },
    },
    {
      id: "delivery-note",
      label: "Not an invoice",
      description: "A delivery note sent in as an invoice. There's no invoice number, total or currency, so schema validation stops it.",
      input: {
        fileName: "dn-5520.pdf",
        receivedVia: "upload",
        text: [
          "DELIVERY NOTE",
          "Supplier: Brightline Office Supplies Ltd",
          "Delivery note: DN-5520",
          "Date: 2026-03-06",
          "",
          "Printer paper (10 boxes)",
          "Toner cartridges (2)",
          "Received by: ____________",
        ].join("\n"),
      },
      expected: { status: "failed", failsAt: "schema" },
    },
    {
      id: "no-text",
      label: "Unreadable scan",
      description: "A scan with no readable text. Text extraction fails, so nothing is guessed.",
      input: { fileName: "scan-0413.jpg", receivedVia: "scanner", text: "" },
      expected: { status: "failed", failsAt: "extract-text" },
    },
    {
      id: "invalid",
      label: "Unsupported file",
      description: "An executable from an unknown channel is rejected before any extraction.",
      input: { fileName: "invoice.exe", receivedVia: "fax", text: "Invoice" },
      expected: { status: "failed", failsAt: "check-file" },
    },
  ],
};
