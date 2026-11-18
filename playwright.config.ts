import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against the static export (`npm run build` first), like the real host would serve it.
// Locally they use the installed Microsoft Edge, so no browser download is needed. In CI, run
// `npx playwright install chromium` and Playwright's bundled Chromium is used instead.
const channel = process.env.CI ? undefined : "msedge";
const port = 4173;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel, viewport: { width: 1366, height: 900 } } },
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], channel, viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: {
    command: "node scripts/serve-out.mjs",
    url: `http://localhost:${port}/`,
    reuseExistingServer: !process.env.CI,
    env: { PORT: String(port) },
  },
});
