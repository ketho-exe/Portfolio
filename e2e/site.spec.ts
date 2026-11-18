import { expect, test } from "@playwright/test";
import { routes } from "./routes";

test.describe("every page", () => {
  for (const route of routes) {
    test(`${route} renders with one h1, a title and no overflow or console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

      const res = await page.goto(route);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page).toHaveTitle(/Szymon Klejny/);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      expect(errors).toEqual([]);
    });
  }
});

test("main navigation reaches every section", async ({ page, isMobile }) => {
  await page.goto("/");
  // Phones and tablets get a bottom tab bar instead of the header links.
  const nav = page.getByRole("navigation", { name: isMobile ? "Sections" : "Main" });
  for (const [label, path, heading] of [
    ["Work", "/projects/", /built/i],
    ["Playground", "/playground/", /automation playground/i],
    ["About", "/about/", /./],
    ["Contact", "/contact/", /./],
  ] as const) {
    await nav.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(path);
    await expect(page.locator("h1")).toHaveText(heading);
    await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
  }
  await page.getByRole("link", { name: /home/ }).click();
  await expect(page).toHaveURL("/");
});

test("a project in the index opens its case study", async ({ page }) => {
  await page.goto("/projects/");
  await page.getByRole("link", { name: /Facilities Management App/ }).click();
  await expect(page).toHaveURL("/projects/facilities-management-app/");
  await expect(page.locator("h1")).toHaveText("Facilities Management App");
});

test("the project filter narrows the index", async ({ page }) => {
  await page.goto("/projects/");
  await page.getByRole("button", { name: /Personal & demos/ }).click();
  await expect(page.getByRole("status")).toHaveText(/Showing 3 of 7/);
  await expect(page.getByRole("link", { name: /Automation Playground/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Facilities Management App/ })).toHaveCount(0);
});

test("unknown pages return 404 with a way home", async ({ page }) => {
  const res = await page.goto("/does-not-exist/");
  expect(res?.status()).toBe(404);
  await expect(page.locator("h1")).toHaveText(/cancelled/);
  await expect(page.getByText("/does-not-exist/")).toBeVisible();
  await page.getByRole("link", { name: "Back to home" }).click();
  await expect(page).toHaveURL("/");
});

test("the Motion switch pauses decorative motion and remembers it", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  const motion = page.getByRole("switch", { name: "Motion" });
  await expect(motion).toHaveAttribute("aria-checked", "true");
  await motion.click();
  await expect(motion).toHaveAttribute("aria-checked", "false");
  await expect(html).toHaveAttribute("data-motion", "off");
  await page.reload();
  await expect(html).toHaveAttribute("data-motion", "off");
  await expect(page.getByRole("switch", { name: "Motion" })).toHaveAttribute("aria-checked", "false");
});

test("the contact button opens email, LinkedIn and GitHub links", async ({ page }) => {
  await page.goto("/about/");
  const button = page.getByRole("button", { name: "Contact me" });
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  const links = page.getByRole("list", { name: "Contact links" });
  await expect(links.getByRole("link", { name: "Email" })).toHaveAttribute("href", /^mailto:/);
  await expect(links.getByRole("link", { name: /GitHub/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(button).toHaveAttribute("aria-expanded", "false");
});

test("CV downloads as a PDF", async ({ page, request }) => {
  await page.goto("/about/");
  const href = await page.getByRole("link", { name: /Download CV/ }).getAttribute("href");
  const res = await request.get(href!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("application/pdf");
  expect((await res.body()).subarray(0, 5).toString()).toBe("%PDF-");
});

test("skip link moves focus to main content", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard journey");
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("robots, sitemap and share image are served", async ({ request, page }) => {
  expect((await request.get("/robots.txt")).status()).toBe(200);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("<urlset");

  await page.goto("/");
  const og = await page.locator('meta[property="og:image"]').getAttribute("content");
  const res = await request.get(new URL(og!).pathname);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", /^Szymon Klejny, .+[^\n]$/);
});
