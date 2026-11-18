import { helpdeskAdapters } from "../adapters/helpdesk";
import type { PlaygroundWorkflow } from "./types";

/**
 * Illustrative shared-inbox triage. Keyword rules (no AI), synthetic emails, simulated helpdesk.
 *
 * receive → check → prepare → categorise → urgency → route → urgent? ─true→ escalate ─┐
 *                                                                    └false→ standard ─┴→ ticket → reply → result
 */
export const emailRouting: PlaygroundWorkflow = {
  definition: {
    id: "email-routing",
    name: "Email routing",
    description:
      "An email to a shared inbox is checked, categorised by keyword rules, routed to a department and prioritised, then logged as a helpdesk ticket with a drafted acknowledgement.",
    nodes: [
      {
        id: "receive",
        type: "trigger",
        label: "Email received",
        description: "A message arrives in the shared inbox.",
      },
      {
        id: "check",
        type: "validate",
        label: "Check message",
        description: "Rejects messages without a valid sender, a subject or a body.",
        config: {
          rules: [
            { field: "from", required: true, pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", message: '"from" must be an email address' },
            { field: "subject", required: true, type: "string", min: 3, max: 200 },
            { field: "body", required: true, type: "string", min: 10, max: 4000 },
          ],
        },
      },
      {
        id: "prepare",
        type: "transform",
        label: "Combine subject and body",
        description: "Builds one text field for the keyword rules to search.",
        config: { assign: [{ field: "text", value: { template: "{{subject}}\n{{body}}" } }] },
      },
      {
        id: "categorise",
        type: "classify",
        label: "Categorise",
        description: "Keyword rules: the category with the most matching keywords wins. No match means General.",
        config: {
          field: "text",
          into: "category",
          categories: [
            {
              label: "Billing",
              keywords: ["invoice", "payment", "overdue", "remittance", "statement", "refund", "credit note", "direct debit"],
            },
            {
              label: "IT support",
              keywords: ["password", "log in", "login", "laptop", "printer", "vpn", "account locked", "software"],
            },
            {
              label: "Facilities",
              keywords: ["leak", "heating", "boiler", "broken", "repair", "lights", "ceiling", "lift", "cleaning"],
            },
            { label: "HR", keywords: ["annual leave", "holiday", "payslip", "payroll", "sick", "onboarding"] },
          ],
          fallback: "General",
        },
      },
      {
        id: "urgency",
        type: "classify",
        label: "Detect urgency",
        config: {
          field: "text",
          into: "priority",
          categories: [
            { label: "Urgent", keywords: ["urgent", "asap", "immediately", "emergency", "outage", "not working"] },
          ],
          fallback: "Normal",
        },
      },
      {
        id: "route",
        type: "transform",
        label: "Route to department",
        config: {
          assign: [
            {
              field: "department",
              value: {
                lookup: {
                  from: "category",
                  table: {
                    Billing: "Accounts",
                    "IT support": "IT service desk",
                    Facilities: "Facilities team",
                    HR: "People team",
                  },
                  default: "Reception (manual triage)",
                },
              },
            },
          ],
        },
      },
      {
        id: "urgent",
        type: "condition",
        label: "Urgent?",
        config: { rules: [{ field: "priority", op: "eq", value: "Urgent" }] },
      },
      {
        id: "escalate",
        type: "transform",
        label: "Escalate",
        config: {
          assign: [
            { field: "ticket.priority", value: { literal: "P1" } },
            { field: "ticket.sla", value: { literal: "4 hours" } },
            { field: "alert", value: { template: "{{department}} on-call lead alerted: {{subject}}" } },
          ],
        },
      },
      {
        id: "standard",
        type: "transform",
        label: "Standard queue",
        config: {
          assign: [
            { field: "ticket.priority", value: { literal: "P3" } },
            { field: "ticket.sla", value: { literal: "2 working days" } },
          ],
        },
      },
      {
        id: "ticket",
        type: "integration",
        label: "Create ticket",
        description: "Simulated helpdesk. Senders on its blocklist are rejected.",
        config: { adapter: "helpdesk.createTicket", params: { blockedDomains: ["bulk-mailer.example"] } },
      },
      {
        id: "reply",
        type: "transform",
        label: "Draft acknowledgement",
        description: "Drafts the reply to the sender. Nothing is sent.",
        config: {
          assign: [
            {
              field: "reply",
              value: {
                template:
                  "Thanks for your email. Your request {{ticket.reference}} is with {{department}} ({{ticket.priority}}, response within {{ticket.sla}}).",
              },
            },
          ],
        },
      },
      {
        id: "result",
        type: "output",
        label: "Routing result",
        config: {
          pick: ["from", "category", "priority", "department", "ticket.reference", "ticket.priority", "alert", "reply"],
        },
      },
    ],
    edges: [
      { id: "receive-check", source: "receive", target: "check" },
      { id: "check-prepare", source: "check", target: "prepare" },
      { id: "prepare-categorise", source: "prepare", target: "categorise" },
      { id: "categorise-urgency", source: "categorise", target: "urgency" },
      { id: "urgency-route", source: "urgency", target: "route" },
      { id: "route-urgent", source: "route", target: "urgent" },
      { id: "urgent-escalate", source: "urgent", target: "escalate", sourceHandle: "true" },
      { id: "urgent-standard", source: "urgent", target: "standard", sourceHandle: "false" },
      { id: "escalate-ticket", source: "escalate", target: "ticket" },
      { id: "standard-ticket", source: "standard", target: "ticket" },
      { id: "ticket-reply", source: "ticket", target: "reply" },
      { id: "reply-result", source: "reply", target: "result" },
    ],
  },

  adapters: helpdeskAdapters,

  samples: [
    {
      id: "billing",
      label: "Overdue invoice",
      description: "A supplier chasing payment. Billing keywords route it to Accounts at standard priority.",
      input: {
        from: "accounts@northgate-supplies.example",
        subject: "Invoice INV-3381 is now overdue",
        body: "Hello, our records show invoice INV-3381 for £1,240.00 is 14 days overdue. Could you confirm when payment will be made? A copy of the statement is attached.",
      },
      expected: {
        status: "success",
        output: { category: "Billing", priority: "Normal", department: "Accounts", "ticket.priority": "P3", alert: null },
      },
    },
    {
      id: "urgent-leak",
      label: "Urgent: water leak",
      description: "A leak reported as urgent. It goes to Facilities and is escalated as P1 with an alert.",
      input: {
        from: "j.patel@example.com",
        subject: "Water leak in second floor kitchen",
        body: "There is water coming through the ceiling above the kitchen sink and it is getting worse. Please send someone urgently.",
      },
      expected: {
        status: "success",
        output: {
          category: "Facilities",
          priority: "Urgent",
          department: "Facilities team",
          "ticket.priority": "P1",
          alert: "Facilities team on-call lead alerted: Water leak in second floor kitchen",
        },
      },
    },
    {
      id: "it",
      label: "Locked account",
      description: "A login problem. IT keywords route it to the service desk.",
      input: {
        from: "r.okafor@example.com",
        subject: "Can't log in after password reset",
        body: "Hi, I reset my password this morning and now my laptop says my account locked. Could someone take a look?",
      },
      expected: {
        status: "success",
        output: { category: "IT support", priority: "Normal", department: "IT service desk", "ticket.priority": "P3" },
      },
    },
    {
      id: "general",
      label: "No category match",
      description: "No keywords match, so it falls back to General and goes to reception for a person to triage.",
      input: {
        from: "visitor@example.org",
        subject: "Visiting your office next week",
        body: "Hello, I'm hoping to visit next Tuesday with a colleague. What time does reception open?",
      },
      expected: {
        status: "success",
        output: { category: "General", department: "Reception (manual triage)", "ticket.priority": "P3" },
      },
    },
    {
      id: "blocked",
      label: "Blocked sender",
      description: "Marketing from a blocked domain. It's categorised and escalated, but the helpdesk refuses it and the run stops.",
      input: {
        from: "offers@bulk-mailer.example",
        subject: "Limited offer: 50% off printer toner",
        body: "Order now and save on toner and paper for your office. This offer ends soon, act immediately!",
      },
      expected: { status: "failed", failsAt: "ticket" },
    },
    {
      id: "invalid",
      label: "Invalid message",
      description: "A malformed sender, empty subject and a too-short body are caught before any routing.",
      input: { from: "not-an-email", subject: "", body: "Hi" },
      expected: { status: "failed", failsAt: "check" },
    },
  ],
};
