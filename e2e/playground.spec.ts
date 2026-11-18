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
  await expect(page.getByText(/Runs entirely in your browser/)).toBeVisible();
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

test("invoice extraction stops a non-invoice and explains why", async ({ page }) => {
  await page.getByRole("button", { name: "Invoice extraction" }).click();
  await page.getByLabel("Sample input").selectOption({ label: "Not an invoice" });
  await runToEnd(page);
  await expect(page.getByRole("status")).toHaveText("Failed");
  await expect(page.getByText("Stopped at", { exact: false })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Invoice number not found" })).toBeVisible();
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
