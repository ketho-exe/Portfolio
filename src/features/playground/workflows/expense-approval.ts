import { financeAdapters } from "../adapters/finance";
import type { PlaygroundWorkflow } from "./types";

/**
 * Anonymised recreation of a company-card approval flow (inspired by professional Glide–Xero work).
 * Synthetic data, illustrative account codes, simulated approval and accounting steps.
 *
 * submit → validate → categorise → policy? ─true→ auto-approve ─┐
 *                                          └false→ manager ──────┴→ approved? ─true→ post ─┐
 *                                                                              └false→ return ┴→ result
 */
export const expenseApproval: PlaygroundWorkflow = {
  definition: {
    id: "expense-approval",
    name: "Expense approval",
    description:
      "A company-card transaction is validated, mapped to an account code, approved by policy or a manager, then posted to the accounting system or returned to the cardholder.",
    nodes: [
      {
        id: "submit",
        type: "trigger",
        label: "Transaction submitted",
        description: "A cardholder submits a company-card transaction for approval.",
      },
      {
        id: "validate",
        type: "validate",
        label: "Validate transaction",
        description: "Checks required fields, formats and allowed values before anything else happens.",
        config: {
          rules: [
            { field: "id", required: true, pattern: "^TX-[0-9]{4,}$", message: '"id" must look like TX-1234' },
            { field: "cardholder", required: true, type: "string", min: 2 },
            { field: "department", required: true, oneOf: ["Operations", "Finance", "Facilities", "Marketing"] },
            { field: "merchant", required: true, type: "string", min: 2 },
            { field: "amount", required: true, type: "number", min: 0.01, max: 10000 },
            { field: "currency", required: true, oneOf: ["GBP"], message: "Only GBP transactions are supported in this demo" },
            { field: "date", required: true, pattern: "^\\d{4}-\\d{2}-\\d{2}$", message: '"date" must be YYYY-MM-DD' },
            { field: "category", required: true, oneOf: ["Travel", "Meals", "Software", "Office supplies", "Entertainment"] },
            { field: "receiptAttached", required: true, type: "boolean" },
          ],
        },
      },
      {
        id: "categorise",
        type: "transform",
        label: "Map to account code",
        description: "Turns the spending category into an account code and builds the ledger description.",
        config: {
          assign: [
            {
              field: "accountCode",
              value: {
                lookup: {
                  from: "category",
                  table: { Travel: "493", Meals: "420", Entertainment: "420", Software: "485", "Office supplies": "461" },
                  default: "429",
                },
              },
            },
            { field: "ledgerDescription", value: { template: "{{merchant}}: {{cardholder}} ({{id}})" } },
          ],
        },
      },
      {
        id: "policy",
        type: "condition",
        label: "Within auto-approval policy?",
        description: "Small, receipted, non-entertainment spend is approved automatically.",
        config: {
          match: "all",
          rules: [
            { field: "amount", op: "lte", value: 100 },
            { field: "receiptAttached", op: "eq", value: true },
            { field: "category", op: "neq", value: "Entertainment" },
          ],
        },
      },
      {
        id: "auto-approve",
        type: "transform",
        label: "Auto-approve",
        config: {
          assign: [
            { field: "approval.status", value: { literal: "approved" } },
            { field: "approval.by", value: { literal: "Policy" } },
            { field: "approval.reason", value: { literal: "Under £100, receipted, not entertainment" } },
          ],
        },
      },
      {
        id: "manager",
        type: "integration",
        label: "Manager approval",
        description: "Simulated manager: needs a receipt above £25 and approves up to £1,000.",
        config: { adapter: "approval.request", params: { approverLimit: 1000, receiptRequiredOver: 25 } },
      },
      {
        id: "approved",
        type: "condition",
        label: "Approved?",
        config: { rules: [{ field: "approval.status", op: "eq", value: "approved" }] },
      },
      {
        id: "post",
        type: "integration",
        label: "Post to accounting",
        description: "Simulated accounting sync. Periods before 2026-01-01 are locked.",
        config: { adapter: "accounting.createSpendTransaction", params: { lockDate: "2026-01-01" } },
      },
      {
        id: "return",
        type: "transform",
        label: "Return to cardholder",
        config: {
          assign: [
            {
              field: "notification",
              value: { template: "{{id}} returned to {{cardholder}}: {{approval.reason}}" },
            },
          ],
        },
      },
      {
        id: "result",
        type: "output",
        label: "Final result",
        config: {
          pick: [
            "id",
            "amount",
            "accountCode",
            "approval.status",
            "approval.by",
            "approval.reason",
            "accounting.reference",
            "notification",
          ],
        },
      },
    ],
    edges: [
      { id: "submit-validate", source: "submit", target: "validate" },
      { id: "validate-categorise", source: "validate", target: "categorise" },
      { id: "categorise-policy", source: "categorise", target: "policy" },
      { id: "policy-auto", source: "policy", target: "auto-approve", sourceHandle: "true" },
      { id: "policy-manager", source: "policy", target: "manager", sourceHandle: "false" },
      { id: "auto-approved", source: "auto-approve", target: "approved" },
      { id: "manager-approved", source: "manager", target: "approved" },
      { id: "approved-post", source: "approved", target: "post", sourceHandle: "true" },
      { id: "approved-return", source: "approved", target: "return", sourceHandle: "false" },
      { id: "post-result", source: "post", target: "result" },
      { id: "return-result", source: "return", target: "result" },
    ],
  },

  adapters: financeAdapters,

  samples: [
    {
      id: "auto",
      label: "Auto-approved",
      description: "£42.50 train ticket with a receipt. It meets the policy, so it posts without a manager.",
      input: {
        id: "TX-1042",
        cardholder: "Sam Taylor",
        department: "Operations",
        merchant: "Rail operator",
        amount: 42.5,
        currency: "GBP",
        date: "2026-03-12",
        category: "Travel",
        receiptAttached: true,
      },
      expected: {
        status: "success",
        output: { "approval.status": "approved", "approval.by": "Policy", accountCode: "493" },
      },
    },
    {
      id: "manager-approves",
      label: "Manager approves",
      description: "£640 software subscription. It's over the policy limit but within the manager's.",
      input: {
        id: "TX-1043",
        cardholder: "Priya Shah",
        department: "Marketing",
        merchant: "Design software vendor",
        amount: 640,
        currency: "GBP",
        date: "2026-04-02",
        category: "Software",
        receiptAttached: true,
      },
      expected: {
        status: "success",
        output: { "approval.status": "approved", "approval.by": "Manager (simulated)", accountCode: "485" },
      },
    },
    {
      id: "over-limit",
      label: "Rejected: over limit",
      description: "£2,400 of office furniture. That's above the manager's £1,000 limit, so it goes back to the cardholder.",
      input: {
        id: "TX-1044",
        cardholder: "Jordan Lee",
        department: "Facilities",
        merchant: "Office furniture supplier",
        amount: 2400,
        currency: "GBP",
        date: "2026-05-20",
        category: "Office supplies",
        receiptAttached: true,
      },
      expected: {
        status: "success",
        output: { "approval.status": "rejected", "accounting.reference": null },
      },
    },
    {
      id: "no-receipt",
      label: "Rejected: no receipt",
      description: "£85 team lunch with no receipt. Policy fails and the manager requires a receipt above £25.",
      input: {
        id: "TX-1045",
        cardholder: "Alex Morgan",
        department: "Finance",
        merchant: "Café",
        amount: 85,
        currency: "GBP",
        date: "2026-06-03",
        category: "Meals",
        receiptAttached: false,
      },
      expected: {
        status: "success",
        output: {
          "approval.status": "rejected",
          notification: "TX-1045 returned to Alex Morgan: Receipt required above £25",
        },
      },
    },
    {
      id: "locked-period",
      label: "Accounting error",
      description: "Approved, but dated in a locked accounting period, so the sync fails and the run stops.",
      input: {
        id: "TX-0998",
        cardholder: "Sam Taylor",
        department: "Operations",
        merchant: "Taxi firm",
        amount: 18.2,
        currency: "GBP",
        date: "2025-12-15",
        category: "Travel",
        receiptAttached: true,
      },
      expected: { status: "failed", failsAt: "post" },
    },
    {
      id: "invalid",
      label: "Invalid submission",
      description: "Missing and malformed fields are caught before any approval or accounting step runs.",
      input: {
        id: "1046",
        cardholder: "Sam Taylor",
        department: "Sales",
        amount: -12,
        currency: "USD",
        date: "12/03/2026",
        category: "Travel",
      },
      expected: { status: "failed", failsAt: "validate" },
    },
  ],
};
