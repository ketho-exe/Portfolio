// From the owner's CV and notes. Businesses within UPL Group are deliberately not named.
export type Role = {
  title: string;
  organisation: string;
  period: string;
  summary: string;
  points: string[];
};

export const experience: Role[] = [
  {
    title: "Low-Code & Software Developer",
    organisation: "UPL Group",
    period: "Mar 2026 – Oct 2026",
    summary:
      "Built internal applications, automation workflows and websites across the group's associated businesses. I contributed to around 10–15 internal projects: some extended existing applications, others involved building substantial new functionality.",
    points: [
      "Co-developed a facilities management web app in a two-person team using Next.js, TypeScript, Supabase and Vercel.",
      "Built and extended Glide applications for financial management, employee management, operations and dashboards, working directly with business leadership.",
      "Built and maintained Zapier workflows connecting internal applications, including Glide–Xero integrations for financial workflows.",
      "Handled Supabase data imports, SQL and relational database structures; managed deployments on Vercel and source code in Git and GitHub.",
      "Investigated application errors, analysed logs, tested fixes and made improvements based on stakeholder feedback.",
      "Prototyped SaaS concepts with AI-assisted tools, including a content submission, review and approval workflow.",
      "Created websites and landing pages, and customised Shopify storefront functionality.",
    ],
  },
  {
    title: "Operations Intern – Automation & Systems",
    organisation: "EAM London Chartered Accountants",
    period: "Oct 2024 – Dec 2025",
    summary:
      "Sole owner of the firm's internal automation function, covering document intake, data processing, invoice preparation and system integration.",
    points: [
      "Automated a weekly billing run of around 200–400 CSV invoices using PowerShell, Excel VBA and Zapier, cutting processing time from several hours to 30 minutes or less.",
      "Built an OCR document intake pipeline with Klippa DocHorizon and JavaScript Azure Functions (including an OpenAI integration) to automate file naming, routing and storage.",
      "Implemented hybrid cloud-to-local automation, using Zapier to trigger and monitor PowerShell scripts on user machines and a shared virtual machine.",
      "Wrote technical and operational documentation covering architecture, data flow, dependencies and failure recovery, and handled all debugging and maintenance.",
    ],
  },
];

export const education = [
  {
    title: "BTEC Extended National Diploma in IT",
    organisation: "Waltham Forest College, London",
    period: "2023 – 2025",
    detail: "Distinction, Distinction, Merit",
  },
];

export const languages = ["English (fluent)", "Polish (fluent)"];
