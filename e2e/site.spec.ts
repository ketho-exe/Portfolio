import { expect, test } from "@playwright/test";
import { routes } from "./routes";

const PRODUCTION_ORIGIN = "https://www.sklejny.dev";

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

    test(`${route} has a self-referencing canonical URL and full Open Graph tags`, async ({ page }) => {
      await page.goto(route);
      const url = `${PRODUCTION_ORIGIN}${route}`;
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", url);
      // A page's openGraph replaces the layout's, so check the shared fields survived.
      for (const [property, value] of [
        ["og:url", url],
        ["og:site_name", "Szymon Klejny"],
        ["og:locale", "en_GB"],
        ["og:type", "website"],
        ["og:image", `${PRODUCTION_ORIGIN}/opengraph-image.png`],
      ]) {
        await expect(page.locator(`meta[property="${property}"]`)).toHaveAttribute("content", value);
      }
    });
  }
});

test("at 320px the full name fits in the header and the Motion switch keeps its name", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  const name = page.getByRole("link", { name: /home/ }).locator("span", { hasText: /^Szymon Klejny$/ });
  await expect(name).toBeVisible();
  expect(await name.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await expect(page.getByRole("switch", { name: "Motion" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
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

test("from 768px the header nav shows; below it the tab bar does", async ({ page }) => {
  for (const [width, header, tabs] of [
    [767, false, true],
    [768, true, false],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible({ visible: header });
    await expect(page.getByRole("navigation", { name: "Sections" })).toBeVisible({ visible: tabs });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  }
});

test("tabbing keeps the focused element clear of the sticky header and tab bar", async ({ page, isMobile }) => {
  test.skip(!isMobile, "the tab bar only shows on phones");
  await page.goto("/about/");
  const chrome = await page.evaluate(() => ({
    top: document.querySelector("header")!.getBoundingClientRect().bottom,
    bottom: document.querySelector('nav[aria-label="Sections"] ul')!.getBoundingClientRect().top,
  }));
  const hidden: string[] = [];
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    const f = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const r = el.getBoundingClientRect();
      // The skip link is position: fixed, so it never scrolls under anything.
      const skip = el === document.body || getComputedStyle(el).position === "fixed";
      return { inChrome: skip || !!el.closest("header, nav[aria-label=Sections]"), top: r.top, bottom: r.bottom, text: el.textContent?.trim().slice(0, 30) };
    });
    if (!f.inChrome && (f.top < chrome.top - 1 || f.bottom > chrome.bottom + 1)) hidden.push(`${f.text} (${f.top}–${f.bottom})`);
  }
  expect(hidden).toEqual([]);
});

test("the root layout carries Person structured data from the site config", async ({ page }) => {
  await page.goto("/");
  const data = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(data).toEqual({
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Szymon Klejny",
    jobTitle: "Software Developer & Automation Specialist",
    url: `${PRODUCTION_ORIGIN}/`,
    email: "sklejny@gmail.com",
    sameAs: ["https://www.linkedin.com/in/szymon-klejny-732a58296/", "https://github.com/ketho-exe"],
  });
});

test("only the home hero has an accent word and an entrance animation", async ({ page }) => {
  for (const route of routes) {
    await page.goto(route);
    const accentWords = page.locator(":is(h1, h2, h3) em");
    await expect(accentWords).toHaveCount(route === "/" ? 1 : 0);
    const heroPops = page.locator('section[aria-labelledby="hero-title"] .pop');
    expect(await page.locator(".pop").count()).toBe(await heroPops.count());
  }
});

test("only long case studies show the reading progress bar and contents list", async ({ page }) => {
  for (const [slug, long] of [
    ["automation-playground", true],
    ["facilities-management-app", false],
  ] as const) {
    await page.goto(`/projects/${slug}/`);
    await expect(page.getByRole("navigation", { name: "On this page" })).toHaveCount(long ? 1 : 0);
    await expect(page.locator(".read-progress")).toHaveCount(long ? 1 : 0);
    await expect(page.getByRole("link", { name: "Ask me about this" })).toBeVisible();
  }
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
  await expect(page.getByRole("status")).toHaveText(/Showing 1 of 5/);
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

test("a 404 with a malformed escape in the path shows it as typed", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const res = await page.goto("/%E0%A4%A/");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("/%E0%A4%A/")).toBeVisible();
  expect(errors).toEqual([]);
});

test("the home highlights sit under one visually hidden heading", async ({ page }) => {
  await page.goto("/");
  const highlights = page.getByRole("region", { name: "Highlights" });
  await expect(highlights.getByRole("heading", { level: 2 })).toHaveText("Highlights");
  await expect(highlights.getByRole("heading", { level: 3, name: "Expense approval" })).toBeVisible();
});

test("ids on the About page are unique", async ({ page }) => {
  await page.goto("/about/");
  const ids = await page.locator("[id]").evaluateAll((els) => els.map((e) => e.id));
  expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
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

test("the contact button opens email, LinkedIn and GitHub links", async ({ page, isMobile }) => {
  test.skip(isMobile, "the button is desktop-only; phones use the tab bar's Contact tab");
  await page.goto("/about/");
  const button = page.getByRole("button", { name: "Contact me" });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-expanded", "true");
  const links = page.getByRole("list", { name: "Contact links" });
  await expect(links.getByRole("link", { name: "Email" })).toHaveAttribute("href", /^mailto:/);
  await expect(links.getByRole("link", { name: /GitHub/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(button).toBeFocused();
});

test("on a phone, the contact button is hidden and the tab bar offers Contact instead", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone layout");
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Contact me" })).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Contact", exact: true })).toBeVisible();
});

test("on a wide touch screen, the contact button opens and closes with taps", async ({ page, isMobile }) => {
  test.skip(!isMobile, "touch journey");
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/about/");
  const button = page.getByRole("button", { name: "Contact me" });
  const linkedin = page.locator(".fab-link", { hasText: "LinkedIn" });
  await button.tap();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(linkedin).toBeVisible();
  await button.tap();
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(linkedin).toBeHidden();
  // A tap elsewhere also closes it.
  await button.tap();
  await page.locator("h1").tap();
  await expect(button).toHaveAttribute("aria-expanded", "false");
});

test("on desktop, hovering previews the links and they stay readable on hover", async ({ page, isMobile }) => {
  test.skip(isMobile, "mouse journey");
  await page.goto("/about/");
  const button = page.getByRole("button", { name: "Contact me" });
  // Its decorative loops are paused while it's closed.
  const ring = page.locator(".fab-ring > span");
  await expect(ring).toHaveCSS("animation-play-state", "paused");
  await button.hover();
  await expect(ring).toHaveCSS("animation-play-state", "running");
  const linkedin = page.locator(".fab-link", { hasText: "LinkedIn" });
  await expect(linkedin).toBeVisible();
  // Let the fan-out transition finish so the mouse lands on LinkedIn, not where it is mid-flight.
  await linkedin.evaluate((a) => Promise.all(a.closest(".fab-item")!.getAnimations().map((t) => t.finished)));
  await linkedin.hover({ force: true }); // it floats, so it is never "stable"
  // Yellow with a dark icon, and a light label on a dark tip (the bug: glass background, dark icon, dark label).
  const colours = () =>
    linkedin.evaluate((a) => {
      const tip = getComputedStyle(a.querySelector(".fab-tip")!);
      return [getComputedStyle(a).backgroundColor, getComputedStyle(a).color, tip.color];
    });
  await expect.poll(colours).toEqual(["rgb(255, 210, 63)", "rgb(17, 18, 20)", "rgb(255, 255, 255)"]);
  await expect(linkedin.locator(".fab-tip")).toBeVisible();
  // Clicking pins it open; clicking the close button shuts it even with the mouse still over it.
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await page.mouse.move(10, 10);
  await expect(linkedin).toBeHidden();
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
  const sitemapText = await sitemap.text();
  expect(sitemapText).toContain("<urlset");
  // Absolute URLs must use the public domain; the vercel.app alias sits behind a login.
  expect(sitemapText).toContain(`<loc>${PRODUCTION_ORIGIN}/</loc>`);
  expect(await (await request.get("/robots.txt")).text()).toContain(`Sitemap: ${PRODUCTION_ORIGIN}/sitemap.xml`);

  await page.goto("/");
  const og = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(new URL(og!).origin).toBe(PRODUCTION_ORIGIN);
  const res = await request.get(new URL(og!).pathname);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
  const icon = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
  const iconRes = await request.get(icon!);
  expect(iconRes.headers()["content-type"]).toBe("image/png");
  expect((await iconRes.body()).readUInt32BE(16)).toBe(180); // PNG width
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", /^Szymon Klejny, .+[^\n]$/);
});
