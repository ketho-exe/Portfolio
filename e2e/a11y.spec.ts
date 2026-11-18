import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { routes } from "./routes";

// WCAG 2.2 A/AA rules in both themes. Desktop only: layout differences don't change these rules much,
// and the mobile project already checks overflow on every page.
for (const scheme of ["dark", "light"] as const) {
  test.describe(`${scheme} theme`, () => {
    test.skip(({ isMobile }) => isMobile, "desktop only");
    for (const route of routes) {
      test(`${route} has no axe violations`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
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
