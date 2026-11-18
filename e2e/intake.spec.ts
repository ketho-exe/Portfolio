import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { makeFixtures } from "./fixtures/make-fixtures";

// Real documents, read in the browser. Fixtures are rendered by the browser at test time.
const dir = join(tmpdir(), "portfolio-e2e-fixtures");
test.beforeAll(async ({ browser }) => makeFixtures(browser, dir));

/** Fails the test if the page talks to any origin other than the site, or logs errors/CSP violations. */
function guard(page: Page) {
  const problems: string[] = [];
  const origin = "http://localhost:4173";
  page.on("request", (r) => {
    if (!r.url().startsWith(origin) && !r.url().startsWith("data:") && !r.url().startsWith("blob:")) problems.push(`request: ${r.url()}`);
    // GET/HEAD only: nothing that could carry a document out, even to this site.
    if (!["GET", "HEAD"].includes(r.method())) problems.push(`${r.method()} ${r.url()}`);
  });
  page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  return problems;
}

async function openWorkflow(page: Page, name: string) {
  await page.goto("/playground/");
  await page.getByRole("button", { name }).click();
}

async function runFile(page: Page, file: string, timeout = 30_000) {
  await page.locator('input[type="file"]').setInputFiles(join(dir, file));
  await expect(page.getByText(`Your file: ${file}`)).toBeVisible();
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(/^(Running|Completed|Failed)/, { timeout });
  const skip = page.getByRole("button", { name: "Skip to end" });
  if (await skip.isVisible().catch(() => false)) await skip.click().catch(() => {});
  await expect(page.getByRole("status")).toHaveText(/^(Completed|Failed)$/, { timeout });
}

async function inspectStep(page: Page, label: string) {
  await page.getByRole("tab", { name: "Steps" }).click();
  await page.getByRole("tabpanel").getByRole("button", { name: new RegExp(label) }).click();
}

async function expectCompleted(page: Page) {
  const stopped = page.locator("p", { hasText: "Stopped at" });
  if (await stopped.count()) throw new Error(`Run failed: ${await stopped.textContent()}`);
  await expect(page.getByRole("status")).toHaveText("Completed");
}

const expectInvoiceFields = async (page: Page) => {
  await expectCompleted(page);
  const result = page.locator("pre").last();
  for (const text of ['"invoiceNumber": "INV-77120"', '"supplier": "Harbourline Stationery Ltd"', '"total": 114.6', '"status": "Ready for approval"']) {
    await expect(result).toContainText(text);
  }
};

test("the page's security policy blocks requests to other sites", async ({ page }) => {
  await page.goto("/playground/");
  const outcome = await page.evaluate(async () => {
    const violation = new Promise<string>((r) => document.addEventListener("securitypolicyviolation", (e) => r(e.violatedDirective), { once: true }));
    const fetched = await fetch("https://example.com/").then(() => "sent", () => "blocked");
    return { fetched, violation: await violation };
  });
  expect(outcome).toEqual({ fetched: "blocked", violation: "connect-src" });
});

test("a PDF with a text layer is read on the device and extracted", async ({ page }) => {
  const problems = guard(page);
  await openWorkflow(page, "Invoice extraction");
  await runFile(page, "invoice.pdf");
  await expectInvoiceFields(page);
  await inspectStep(page, "Extract text");
  await expect(page.getByRole("tabpanel")).toContainText("via PDF text layer");
  await expect(page.getByRole("tabpanel")).toContainText("Runs on your device.");
  expect(problems).toEqual([]);
});

test("an image is read with OCR on the device", async ({ page, isMobile }) => {
  test.skip(isMobile, "OCR covered on desktop");
  test.setTimeout(120_000);
  const problems = guard(page);
  await openWorkflow(page, "Invoice extraction");
  await runFile(page, "invoice.png", 90_000);
  await expectInvoiceFields(page);
  expect(problems).toEqual([]);
});

test("a scanned PDF without text is rendered and read with OCR", async ({ page, isMobile }) => {
  test.skip(isMobile, "OCR covered on desktop");
  test.setTimeout(120_000);
  const problems = guard(page);
  await openWorkflow(page, "Invoice extraction");
  await runFile(page, "scan.pdf", 90_000);
  await expectInvoiceFields(page);
  await inspectStep(page, "Extract text");
  await expect(page.getByRole("tabpanel")).toContainText("via OCR of scanned PDF");
  expect(problems).toEqual([]);
});

test("an .eml file is parsed locally and routed", async ({ page }) => {
  const problems = guard(page);
  await openWorkflow(page, "Email routing");
  await runFile(page, "leak.eml");
  await expect(page.getByRole("status")).toHaveText("Completed");
  await expect(page.locator("pre").last()).toContainText('"ticket.priority": "P1"');
  expect(problems).toEqual([]);
});

test("unsupported files are refused before anything reads them", async ({ page }) => {
  await openWorkflow(page, "Invoice extraction");
  await page.locator('input[type="file"]').setInputFiles({ name: "notes.docx", mimeType: "application/octet-stream", buffer: Buffer.from("x") });
  await expect(page.getByRole("alert").filter({ hasText: /isn't supported here/ })).toBeVisible();
  await expect(page.getByText(/Your file:/)).toHaveCount(0);
});

test("results download as JSON and CSV, generated in the browser", async ({ page }) => {
  await openWorkflow(page, "Invoice extraction");
  await runFile(page, "invoice.pdf");
  await expectCompleted(page);
  const [json] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download JSON" }).click()]);
  expect(json.suggestedFilename()).toBe("document-processing-result.json");
  expect(JSON.parse(readFileSync(await json.path(), "utf-8"))).toMatchObject({ extracted: { invoiceNumber: "INV-77120" } });
  const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download CSV" }).click()]);
  expect(readFileSync(await csv.path(), "utf-8")).toContain("extracted.invoiceNumber");
});

test("removing the file returns to the samples", async ({ page }) => {
  await openWorkflow(page, "Invoice extraction");
  await page.locator('input[type="file"]').setInputFiles(join(dir, "invoice.pdf"));
  await page.getByRole("button", { name: "Remove file" }).click();
  await expect(page.getByText(/Your file:/)).toHaveCount(0);
  await expect(page.getByLabel(/Edit the JSON/)).toHaveValue(/brightline-inv-20431\.pdf/);
});
