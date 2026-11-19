import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function runToEnd(page: Page) {
  await page.getByRole("button", { name: /^Run/ }).click();
  const skip = page.getByRole("button", { name: "Skip to end" });
  if (await skip.isVisible().catch(() => false)) await skip.click().catch(() => {});
  await expect(page.getByRole("status")).not.toHaveText(/Running|Ready/);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/playground/");
  await expect(page.locator(".react-flow__node")).not.toHaveCount(0);
});

test("simulation is always labelled", async ({ page }) => {
  await expect(page.getByText(/Everything runs in your browser/)).toBeVisible();
});

test("expense approval auto-approves the default sample", async ({ page }) => {
  await runToEnd(page);
  await expect(page.getByRole("status")).toHaveText("Completed");
  await expect(page.getByText('"approval.by": "Policy"')).toBeVisible();
});

test("email routing escalates an urgent email", async ({ page }) => {
  await page.getByRole("button", { name: "Email routing" }).click();
  await page.getByLabel("Sample input").selectOption({ label: "Urgent: water leak" });
  await runToEnd(page);
  await expect(page.getByRole("status")).toHaveText("Completed");
  await expect(page.getByText('"ticket.priority": "P1"')).toBeVisible();
});

async function pauseForReview(page: Page, sample: string) {
  await page.getByRole("button", { name: "Invoice extraction" }).click();
  await page.getByLabel("Sample input").selectOption({ label: sample });
  await runToEnd(page);
  await expect(page.getByRole("status")).toHaveText(/waiting for your review/);
  await expect(page.getByRole("tab", { name: "Review" })).toHaveAttribute("aria-selected", "true");
}

async function finish(page: Page) {
  const skip = page.getByRole("button", { name: "Skip to end" });
  if (await skip.isVisible().catch(() => false)) await skip.click().catch(() => {});
  await expect(page.getByRole("status")).toHaveText(/^(Completed|Failed)$/);
}

test("invoice extraction pauses for review, and corrections carry through", async ({ page }) => {
  await pauseForReview(page, "Unclear layout");
  const panel = page.getByRole("tabpanel");
  await expect(panel.getByText("Not found · check")).toHaveCount(2); // due date and net
  const number = panel.getByLabel("Invoice number");
  await expect(number).toHaveValue("88213");

  await panel.getByLabel("Total").fill("five hundred");
  await panel.getByRole("button", { name: "Confirm and continue" }).click();
  await expect(panel.getByText("Total must be a number")).toBeVisible();
  await expect(panel.getByLabel("Total")).toBeFocused();

  await panel.getByLabel("Total").fill("504.00");
  await number.fill("NCS-88213");
  await panel.getByRole("button", { name: "Confirm and continue" }).click();
  await finish(page);
  await expect(page.getByRole("status")).toHaveText("Completed");
  await expect(page.getByText('"invoiceNumber": "NCS-88213"')).toBeVisible();
  await expect(page.getByText('"status": "Ready for approval"')).toBeVisible();
});

test("a non-invoice can be rejected in review", async ({ page }) => {
  await pauseForReview(page, "Not an invoice");
  await page.getByRole("button", { name: "Reject document" }).click();
  await finish(page);
  await expect(page.getByRole("status")).toHaveText("Failed");
  await expect(page.locator("p", { hasText: "Stopped at" })).toContainText("Rejected in review.");
});

test("a confirmed non-invoice is stopped by schema validation", async ({ page }) => {
  await pauseForReview(page, "Not an invoice");
  await page.getByRole("button", { name: "Confirm and continue" }).click();
  await finish(page);
  await expect(page.getByRole("status")).toHaveText("Failed");
  await expect(page.getByRole("listitem").filter({ hasText: "Invoice number not found" })).toBeVisible();
});

test("the review form has no axe violations", async ({ page }) => {
  await pauseForReview(page, "Unclear layout");
  const { violations } = await new AxeBuilder({ page }).include("[role=tabpanel]").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(violations.map((v) => v.id)).toEqual([]);
});

test("selecting a step shows what it received and produced", async ({ page }) => {
  await runToEnd(page);
  await page.locator(".react-flow__node", { hasText: "Map to account code" }).click();
  await expect(page.getByRole("tab", { name: "Steps" })).toHaveAttribute("aria-selected", "true");
  const panel = page.getByRole("tabpanel");
  await expect(panel.getByText("Map to account code")).toBeVisible();
  await expect(panel.getByText('"accountCode": "493"')).toBeVisible();
});

test("invalid JSON blocks the run with a message, and reset restores the sample", async ({ page }) => {
  const input = page.getByLabel(/Edit the JSON/);
  await input.fill("{ not json");
  await expect(page.getByText(/Invalid JSON/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Run" })).toBeDisabled();
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(input).toHaveValue(/"TX-1042"/);
  await expect(page.getByRole("button", { name: "Run" })).toBeEnabled();
});

test("tabs support arrow keys", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard journey");
  await page.getByRole("tab", { name: "Input" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Steps" })).toBeFocused();
  await expect(page.getByRole("tab", { name: "Steps" })).toHaveAttribute("aria-selected", "true");
});
