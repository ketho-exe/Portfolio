import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { routes } from "./routes";

// WCAG 2.2 A/AA rules. The site has one (dark) theme. Run on both layouts: phones get a different
// navigation (bottom tab bar), so landmarks and names differ.
for (const motion of ["reduce", "no-preference"] as const) {
  test.describe(`motion: ${motion}`, () => {
    test.skip(({ isMobile }) => isMobile && motion === "no-preference", "one mobile pass is enough");
    for (const route of [...routes, "/does-not-exist/"]) {
      test(`${route} has no axe violations`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: motion });
        await page.goto(route);
        if (route === "/playground/") await expect(page.locator(".react-flow__node")).not.toHaveCount(0);
        const { violations } = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(
          violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`),
        ).toEqual([]);
      });
    }
  });
}
