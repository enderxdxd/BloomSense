import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

const testSecret = "playwright-nextauth-secret-minimum-32-chars";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html"], ["github"]] : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npx next dev -p ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          NEXTAUTH_SECRET: testSecret,
          NEXTAUTH_URL: baseURL,
          DATABASE_URL:
            "postgresql://postgres:postgres@127.0.0.1:5432/bloomsense_e2e?schema=public",
          DIRECT_URL:
            "postgresql://postgres:postgres@127.0.0.1:5432/bloomsense_e2e?schema=public",
          OPENAI_API_KEY: "sk-e2e-placeholder",
          STRIPE_SECRET_KEY: "",
          STRIPE_WEBHOOK_SECRET: "",
          UPSTASH_REDIS_REST_URL: "",
          UPSTASH_REDIS_REST_TOKEN: "",
          SUPABASE_URL: "",
          SUPABASE_SERVICE_ROLE_KEY: "",
        },
      },
});
