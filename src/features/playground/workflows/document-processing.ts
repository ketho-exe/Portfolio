import { documentAdapters, localTextExtractionAdapter } from "../adapters/documents";
import { readDocument } from "../intake/read-document";
import type { PlaygroundWorkflow } from "./types";

/**
 * Invoice intake (a recreation of OCR document intake work).
 * Samples: synthetic invoice text, simulated text extraction.
 * Uploads: the visitor's own PDF or image, read on their device with PDF.js / Tesseract.js OCR.
 * Field extraction is a real rule-based parser with confidence scores (no AI model).
 *
 * Low-confidence results pause for a person (the visitor) to check and correct, then are validated.
 *
 * receive → check-file → extract-text → extract-fields → confident? ─true──────────┐
 *                                                                  └false→ review ─┴→ schema → queue → result
 */
export const documentProcessing: PlaygroundWorkflow = {
  definition: {
    id: "document-processing",
    name: "Invoice extraction",
    description:
      "A supplier invoice is checked and its text extracted, then rule-based extraction reads each field and scores its confidence. If any required field is uncertain, the run pauses for you to check and correct it. The result is validated against a schema and queued for approval. Try a sample, or your own PDF or image: it's read on your device and never uploaded.",
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
              pattern: "^[^/\\\\]{1,200}\\.([Pp][Dd][Ff]|[Pp][Nn][Gg]|[Jj][Pp][Ee]?[Gg]|[Ww][Ee][Bb][Pp]|[Tt][Xx][Tt])$",
              message: '"fileName" must be a PDF, PNG, JPG, WebP or TXT file',
            },
            { field: "receivedVia", required: true, oneOf: ["email", "upload", "scanner"] },
            { field: "sizeBytes", type: "number", min: 1, max: 10485760, message: "File must be under 10 MB" },
            { field: "text", type: "string", max: 6000 },
          ],
        },
      },
      {
        id: "extract-text",
        type: "integration",
        label: "Extract text",
        description:
          "Your file: PDF text layer, or OCR for scans and images, on your device. Samples: the sample's text stands in for the document (simulated).",
        config: { adapter: "document.extractText", timeoutMs: 90_000 },
      },
      {
        id: "extract-fields",
        type: "integration",
        label: "Extract invoice fields",
        description:
          'Rule-based, not AI: reads labelled fields like "Total due:" and scores its confidence in each. It never invents a missing value. A production system might use an AI model here; this runs on your device instead.',
        config: { adapter: "extract.invoiceFields" },
      },
      {
        id: "confident",
        type: "condition",
        label: "Confident enough?",
        description: "Every required field must have been read with at least 0.8 confidence.",
        config: { rules: [{ field: "extraction.lowestConfidence", op: "gte", value: 0.8 }] },
      },
      {
        id: "review",
        type: "review",
        label: "Check uncertain fields",
        description:
          "A real pause for a person: you. Each field is shown with its confidence; correct anything wrong, then confirm or reject the document.",
        config: {
          fields: [
            { field: "extracted.supplier", label: "Supplier", confidence: "extraction.confidence.supplier" },
            { field: "extracted.invoiceNumber", label: "Invoice number", confidence: "extraction.confidence.invoiceNumber" },
            { field: "extracted.invoiceDate", label: "Invoice date", kind: "date", confidence: "extraction.confidence.invoiceDate" },
            { field: "extracted.dueDate", label: "Due date", kind: "date", confidence: "extraction.confidence.dueDate" },
            { field: "extracted.currency", label: "Currency", options: ["GBP", "EUR", "USD"], confidence: "extraction.confidence.currency" },
            { field: "extracted.net", label: "Net", kind: "number", confidence: "extraction.confidence.net" },
            { field: "extracted.vat", label: "VAT", kind: "number", confidence: "extraction.confidence.vat" },
            { field: "extracted.total", label: "Total", kind: "number", confidence: "extraction.confidence.total" },
          ],
          threshold: 0.8,
          reference: "text",
          into: "review",
        },
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
        id: "result",
        type: "output",
        label: "Structured result",
        config: { pick: ["fileName", "status", "nextStep", "extracted", "extraction.lowestConfidence", "review"] },
      },
    ],
    edges: [
      { id: "receive-check", source: "receive", target: "check-file" },
      { id: "check-extract", source: "check-file", target: "extract-text" },
      { id: "extract-fields", source: "extract-text", target: "extract-fields" },
      { id: "fields-confident", source: "extract-fields", target: "confident" },
      { id: "confident-schema", source: "confident", target: "schema", sourceHandle: "true" },
      { id: "confident-review", source: "confident", target: "review", sourceHandle: "false" },
      { id: "review-schema", source: "review", target: "schema" },
      { id: "schema-queue", source: "schema", target: "queue" },
      { id: "queue-result", source: "queue", target: "result" },
    ],
  },

  adapters: documentAdapters,

  upload: {
    kinds: ["pdf", "image", "text"],
    hint: "PDF, PNG, JPG, WebP or TXT, up to 10 MB. Scans and photos are read with OCR.",
    async toInput(file) {
      return { fileName: file.name, receivedVia: "upload", sizeBytes: file.size };
    },
    adapters: (file, onProgress) => ({
      ...documentAdapters,
      "document.extractText": localTextExtractionAdapter(file, readDocument, onProgress),
    }),
  },

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
      description: "No field labels, so supplier, reference, date and total are guesses. The run pauses for you to check them.",
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
      expected: { status: "waiting", waitsAt: "review" },
    },
    {
      id: "delivery-note",
      label: "Not an invoice",
      description: "A delivery note sent in as an invoice. Invoice number, total and currency are missing, so it pauses for you: reject it, or confirm it and see schema validation stop it.",
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
      expected: { status: "waiting", waitsAt: "review" },
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
