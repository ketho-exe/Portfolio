/**
 * Project and case-study content. Rules (see AGENTS.md):
 * - Never invent outcomes, metrics, users or commercial results. Figures here come from the owner's CV.
 * - `kind` must honestly distinguish professional work from demos and experiments.
 * - Professional work is anonymised: no proprietary code, data, screenshots or named sub-businesses.
 * - Planned projects describe intent only; replace with real detail as work lands.
 */

export type ProjectCategory = "Web application" | "Automation" | "Integration" | "AI" | "Low-code";
export type ProjectKind = "Professional work" | "Personal project" | "Recreated demonstration" | "Experiment";
export type ProjectStatus = "Planned" | "In progress" | "Live" | "Delivered";

/** Case-study sections, rendered in this order when present. */
export const caseStudySections = [
  ["overview", "Overview"],
  ["problem", "Problem"],
  ["goals", "Goals"],
  ["solution", "Solution"],
  ["contribution", "My contribution"],
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
  organisation?: string;
  period?: string;
  technologies: string[];
  featured: boolean;
  links?: { demo?: string; source?: string };
  /** Each section is a list of paragraphs. */
  caseStudy: Partial<Record<CaseStudyKey, string[]>>;
};

export const projects: Project[] = [
  // ── Professional work ────────────────────────────────────────────────
  {
    slug: "facilities-management-app",
    name: "Facilities Management App",
    summary:
      "An internal web app, co-developed in a team of two, that replaced spreadsheets, paper and digital forms and an older Glide app for around 10 internal users.",
    categories: ["Web application"],
    kind: "Professional work",
    status: "Delivered",
    organisation: "UPL Group",
    period: "2026",
    technologies: ["Next.js", "TypeScript", "Supabase", "PostgreSQL", "Vercel"],
    featured: true,
    caseStudy: {
      overview: [
        "A facilities management web application for internal staff, co-developed in a two-person team. It extended functionality beyond the original Glide implementation.",
      ],
      problem: [
        "Facilities work was managed through a mix of spreadsheets, paper forms, digital forms and an older Glide app.",
      ],
      solution: [
        "A single web application on a relational Supabase (PostgreSQL) database, built with Next.js and TypeScript and deployed on Vercel.",
      ],
      contribution: [
        "Co-developer in a team of two: building application functionality, working with the Supabase data model and imports, deploying through Vercel and managing source code in Git and GitHub.",
        "Investigated errors, analysed logs, tested fixes and made improvements based on feedback from the people using it.",
      ],
      outcome: [
        "Replaced the previous mix of spreadsheets, forms and the Glide app for around 10 internal users.",
        "It is an internal tool, so there is no public demo, and details are generalised to protect confidential information.",
      ],
    },
  },
  {
    slug: "billing-run-automation",
    name: "Weekly Billing Run Automation",
    summary:
      "Automated a weekly run of around 200–400 CSV invoices at an accounting firm, cutting processing time from several hours to 30 minutes or less.",
    categories: ["Automation", "Integration"],
    kind: "Professional work",
    status: "Delivered",
    organisation: "EAM London Chartered Accountants",
    period: "2024–2025",
    technologies: ["PowerShell", "Excel VBA", "Zapier"],
    featured: true,
    caseStudy: {
      overview: [
        "Part of the firm's internal automation function, which I owned as sole developer during my internship.",
      ],
      problem: [
        "Every week, around 200–400 invoices had to be prepared from CSV data, checked and recorded in accounting systems. The run took several hours.",
      ],
      solution: [
        "Excel VBA frameworks import the CSV data into billing templates, validate the figures and cross-check totals. Zapier then generates the invoices and syncs records with the accounting systems.",
        "The run combines PowerShell, Excel VBA and Zapier.",
      ],
      contribution: [
        "Designed, built, documented and maintained the whole process on my own, including debugging and failure recovery.",
      ],
      outcome: [
        "Processing time went from several hours to 30 minutes or less per weekly run.",
        "No code or client data is shown here.",
      ],
    },
  },
  {
    slug: "document-intake-pipeline",
    name: "OCR Document Intake Pipeline",
    summary:
      "Extracts data from scanned documents to automate file naming, routing and storage in SharePoint, using OCR, Azure Functions and an OpenAI integration.",
    categories: ["Automation", "AI", "Integration"],
    kind: "Professional work",
    status: "Delivered",
    organisation: "EAM London Chartered Accountants",
    period: "2024–2025",
    technologies: ["Klippa DocHorizon", "Azure Functions", "JavaScript", "OpenAI API", "Zapier", "SharePoint"],
    featured: true,
    caseStudy: {
      overview: [
        "A document intake pipeline that turns scanned documents into correctly named, routed and stored files.",
      ],
      problem: [
        "File naming, routing and storage for incoming scanned documents needed to be automated.",
      ],
      solution: [
        "Klippa DocHorizon performs OCR on incoming documents. JavaScript Azure Functions, including one that calls the OpenAI API, process the OCR output and return filenames and metadata. Zapier carries the results into SharePoint.",
      ],
      contribution: [
        "Built and maintained the pipeline as the firm's sole automation developer, and wrote documentation covering its architecture, data flow, dependencies and failure recovery.",
      ],
      outcome: [
        "No documents, client data or code are shown. The AI Document Processor project below will be a public, synthetic-data recreation of this kind of workflow.",
      ],
    },
  },
  {
    slug: "glide-apps-xero-integration",
    name: "Business Apps & Xero Integration",
    summary:
      "Glide applications for finance, staff and operations, connected by Zapier workflows, including moving approved cardholder transactions into Xero.",
    categories: ["Low-code", "Automation", "Integration"],
    kind: "Professional work",
    status: "Delivered",
    organisation: "UPL Group",
    period: "2026",
    technologies: ["Glide", "Zapier", "Xero"],
    featured: true,
    caseStudy: {
      overview: [
        "A set of internal Glide applications for financial management, employee management, operations and dashboards, plus the Zapier workflows connecting them to other systems.",
      ],
      solution: [
        "Glide apps for each of these areas, with Zapier workflows connecting internal applications, including Glide and Xero.",
        "One workflow automates the transfer of approved cardholder transactions into the appropriate Xero business workflow.",
      ],
      contribution: [
        "Built new apps and extended existing ones, working directly with business leadership to turn requirements into working tools, then maintained them based on feedback.",
      ],
      outcome: [
        "Internal tools with confidential data, so there are no screenshots. The Automation Playground will include an anonymised, runnable recreation of the expense approval flow.",
      ],
    },
  },

  // ── Personal projects (in development) ──────────────────────────────────
  {
    slug: "automation-playground",
    name: "Automation Playground",
    summary:
      "Interactive business workflows you can inspect and run step by step, powered by a small typed execution engine in the browser.",
    categories: ["Automation", "Web application"],
    kind: "Personal project",
    status: "In progress",
    technologies: ["Next.js", "TypeScript", "React Flow", "Zod", "Vitest"],
    featured: false,
    links: { demo: "/playground/" },
    caseStudy: {
      overview: [
        "A focused environment for exploring example business workflows: select one, edit the sample input, run it and inspect what every step received and produced.",
      ],
      problem: [
        "Automation work is usually invisible because it lives in back-office tools. Screenshots of workflow builders say little about the logic behind them, and real client workflows can't be shown at all.",
      ],
      goals: [
        "Make workflow logic visible and interactive: validation, conditions, branching and integration steps.",
        "Run entirely in the browser with deterministic, clearly labelled simulations and no API keys.",
      ],
      solution: [
        "Workflows are stored as typed data and validated with schemas. A TypeScript engine executes nodes in dependency order and records each node's input, output and status. React Flow renders the graph and execution state.",
        "First workflows: an expense approval flow recreated from professional work, email routing, and document processing with mocked AI.",
      ],
      architecture: [
        "The engine is plain TypeScript with no UI dependencies: a Zod schema with seven node types (trigger, validate, condition, transform, classify, integration, output), a graph validator and an async runner. React Flow renders the graph; the UI replays the engine's event log to animate each step.",
        "Integrations sit behind adapters. In the browser every adapter is a deterministic mock and is labelled as simulated. A real integration would run server-side behind the same interface.",
      ],
      implementation: [
        "Workflows are validated before they run: exactly one trigger, every edge pointing at a real step, branch labels on condition edges, no loops, and every step reachable. Field paths that could reach JavaScript object internals are rejected.",
        "Steps run in dependency order. A condition makes only its matching branch live, so the other branch is marked skipped, and two branches can rejoin. A failure stops the run safely, and each step has a timeout.",
      ],
      testing: [
        "Vitest covers graph validation, branching, joins, failures, timeouts and determinism. Every sample input in the playground stores its expected outcome, and the tests check it, so a sample's label can't drift from what it does.",
      ],
      outcome: [
        "The expense approval workflow is live in the playground. Email routing and document processing workflows are next.",
        "Limitations: no loops, parallel steps or custom code, by design. Everything is simulated, and nothing connects to real services.",
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
    featured: false,
    caseStudy: {
      overview: [
        "A realistic internal tool built on sample data to show full-stack development: data modelling, CRUD, activity history and charts.",
      ],
      goals: [
        "Show database design and server-side data handling alongside a usable interface.",
        "Keep hosting at zero cost, and only add authentication if it adds real value.",
      ],
    },
  },
  {
    slug: "ai-document-processor",
    name: "AI Document Processor",
    summary:
      "Turns sample documents into validated structured data. Processing is deterministic and mocked by default, with optional real model calls.",
    categories: ["AI", "Automation"],
    kind: "Recreated demonstration",
    status: "Planned",
    technologies: ["TypeScript", "Zod"],
    featured: false,
    caseStudy: {
      overview: [
        "A public recreation of document intake work, using synthetic documents. It extracts structured fields, validates them against a schema and handles errors clearly.",
      ],
      goals: [
        "Work without paid APIs by default. Any real AI execution must be optional and protected against unexpected costs.",
      ],
    },
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
