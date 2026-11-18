import { defineConfig } from "vitest/config";

// Unit tests live next to the code in src/. e2e/ holds Playwright specs (run with `npm run e2e`).
export default defineConfig({ test: { include: ["src/**/*.test.ts"] } });
