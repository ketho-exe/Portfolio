/**
 * Project and case-study content. Rules (see AGENTS.md):
 * - Never invent outcomes, metrics, users or commercial results.
 * - `kind` must honestly distinguish professional work from demos and experiments.
 * - Planned projects describe intent only; replace with real detail as work lands.
 */

export type ProjectCategory = "Web application" | "Automation" | "Integration" | "AI" | "Web design";
export type ProjectKind = "Professional work" | "Personal project" | "Recreated demonstration" | "Experiment";
export type ProjectStatus = "Planned" | "In progress" | "Live";

/** Case-study sections, rendered in this order when present. */
export const caseStudySections = [
  ["overview", "Overview"],
  ["problem", "Problem"],
  ["goals", "Goals"],
  ["solution", "Solution"],
  ["contribution", "Personal contribution"],
  ["architecture", "Architecture and technologies"],
  ["implementation", "Implementation details"],
  ["challenges", "Challenges and decisions"],
  ["testing", "Testing"],
  ["outcome", "Outcome and limitations"],
] as const;

export type CaseStudyKey = (typeof caseStudySections)[number][0];

export type Project = {
  slug: string;
  name: string;
  summary: string;
  categories: ProjectCategory[];
  kind: ProjectKind;
  status: ProjectStatus;
  technologies: string[];
  featured: boolean;
  links?: { demo?: string; source?: string };
  /** Each section is a list of paragraphs. */
  caseStudy: Partial<Record<CaseStudyKey, string[]>>;
};

export const projects: Project[] = [
  {
    slug: "automation-playground",
    name: "Automation Playground",
    summary:
      "Interactive business workflows you can inspect and run step by step, powered by a small typed execution engine in the browser.",
    categories: ["Automation", "Web application"],
    kind: "Personal project",
    status: "Planned",
    technologies: ["Next.js", "TypeScript", "React Flow", "Zod"],
    featured: true,
    caseStudy: {
      overview: [
        "A focused environment for exploring example business workflows: select one, edit the sample input, run it and inspect what every step received and produced.",
      ],
      problem: [
        "Automation work is usually invisible: it lives in back-office tools and is hard to show in a portfolio. Screenshots of workflow builders say little about the logic behind them.",
      ],
      goals: [
        "Make workflow logic — validation, conditions, branching, integration steps — visible and interactive.",
        "Run entirely in the browser with deterministic, clearly labelled simulations and no API keys.",
      ],
      solution: [
        "Workflows are stored as typed data and validated with schemas. A TypeScript engine executes nodes in dependency order and records each node's input, output and status; React Flow renders the graph and execution state.",
        "Initial workflows: expense approval, AI document processing (mocked) and email routing.",
      ],
    },
  },
  {
    slug: "expense-approval",
    name: "Expense Approval Workflow",
    summary:
      "An anonymised recreation of an expense submission and approval process: validation, approval rules, decisions and a simulated accounting sync.",
    categories: ["Automation", "Integration"],
    kind: "Recreated demonstration",
    status: "Planned",
    technologies: ["TypeScript", "Zod", "Webhooks (simulated)"],
    featured: true,
    caseStudy: {
      overview: [
        "A safe demonstration inspired by previous professional work on expense approval automation. It uses synthetic data only and contains no proprietary code, data or screenshots.",
      ],
      goals: [
        "Show how a submission is validated, categorised, routed through approval rules and passed to an accounting system.",
        "Keep a clear processing history for every expense.",
      ],
      solution: [
        "Built as the first workflow in the Automation Playground, with the accounting step behind an adapter so a real sandbox integration could be added later without changing the workflow.",
      ],
    },
  },
  {
    slug: "operations-dashboard",
    name: "Business Operations Dashboard",
    summary:
      "A full-stack dashboard for projects, tasks and activity history with CRUD operations and data visualisation.",
    categories: ["Web application"],
    kind: "Personal project",
    status: "Planned",
    technologies: ["Next.js", "TypeScript", "PostgreSQL"],
    featured: true,
    caseStudy: {
      overview: [
        "A realistic internal tool built with sample data to demonstrate full-stack application development: data modelling, CRUD, activity history and charts.",
      ],
      goals: [
        "Demonstrate database design and server-side data handling alongside a usable interface.",
        "Keep hosting at zero cost and avoid authentication unless it adds real value.",
      ],
    },
  },
  {
    slug: "ai-document-processor",
    name: "AI Document Processor",
    summary:
      "Turns sample documents into validated structured data, with deterministic mock processing by default and optional real model calls.",
    categories: ["AI", "Automation"],
    kind: "Personal project",
    status: "Planned",
    technologies: ["TypeScript", "Zod"],
    featured: false,
    caseStudy: {
      overview: [
        "Demonstrates extracting structured fields from documents, validating them against a schema and handling errors clearly.",
      ],
      goals: [
        "Work without paid APIs by default; any real AI execution must be optional and cost-protected.",
      ],
    },
  },
  {
    slug: "business-website",
    name: "Business Website",
    summary:
      "One polished, responsive website for a fictional business, focused on visual design and frontend quality.",
    categories: ["Web design"],
    kind: "Personal project",
    status: "Planned",
    technologies: ["Next.js", "Tailwind CSS"],
    featured: false,
    caseStudy: {
      overview: [
        "A single, carefully designed site rather than several generic landing pages, clearly presented as a concept for a fictional business.",
      ],
    },
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
