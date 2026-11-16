import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3100);
const CI = !!process.env.CI;

/**
 * Verification suite: proves every trap in traps/registry.ts behaves as documented.
 * Runs against a production build (dev-mode hydration timing is not representative).
 * In CI the workflow builds first; locally `npm run verify` builds and starts the server.
 */
export default defineConfig({
  testDir: ".",
  outputDir: "./.results",
  timeout: 45_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  workers: CI ? 2 : undefined,
  retries: CI ? 1 : 0,
  reporter: CI ? [["list"], ["html", { outputFolder: "./.report", open: "never" }], ["github"]] : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: CI || process.env.SKIP_BUILD ? `npm run start -- -p ${PORT}` : `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !CI,
    timeout: 240_000,
    cwd: "..",
  },
});
