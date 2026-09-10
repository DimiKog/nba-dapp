import { defineConfig, devices } from "@playwright/test";

const mockBackendUrl = "http://127.0.0.1:3101";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3102",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: [
    {
      command: "node tests/e2e/mock-backend.mjs",
      url: `${mockBackendUrl}/api/health`,
      reuseExistingServer: true,
      timeout: 30_000,
      stdout: "pipe",
    },
    {
      command: "NEXT_PUBLIC_API_URL=http://127.0.0.1:3101 FANTASY_IDENTITY_API_KEY=e2e-identity-key CLOUDFLARE_ACCESS_AUD=e2e-audience CLOUDFLARE_ACCESS_TEAM_DOMAIN=http://127.0.0.1:3101 npm run start -- --port 3102",
      url: "http://127.0.0.1:3102",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
