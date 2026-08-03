import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:8080",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "bash -c 'set -a && source .env.local && set +a && npm run dev'",
    url: "http://localhost:8080",
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: "setup", testMatch: /admin-auth\.setup\.ts/ },
    {
      name: "chromium",
      testMatch: /^(?!.*admin-guarda).*\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        channel: "msedge",
        storageState: "tmp/smoke-admin-storage.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "no-auth",
      testMatch: /admin-guarda\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], channel: "msedge" },
    },
  ],
});
