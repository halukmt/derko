import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: './playwright-results',

  // Run all tests in parallel
  fullyParallel: true,
  // Fail fast on CI
  forbidOnly: !!process.env.CI,
  // Retry once locally and twice on CI to handle flaky network/timing tests
  retries: process.env.CI ? 2 : 1,
  // Limit workers to avoid overwhelming the Docker server under parallel load
  workers: process.env.CI ? 1 : 4,

  reporter: [
    ['list'],
    ['html', { outputFolder: './playwright-report', open: 'never' }],
  ],

  use: {
    // Docker dev server
    baseURL: 'http://localhost:8081',
    // Keep cookies between requests in the same test (important for session/CSRF)
    extraHTTPHeaders: {},
    // Capture screenshots + traces only on failure
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    // Generous timeout for Docker startup latency
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    // Dismiss cookie consent banner before every page – avoids overlay blocking clicks
    storageState: {
      cookies: [],
      origins: [
        {
          origin: 'http://localhost:8081',
          localStorage: [{ name: 'siteConsent', value: 'true' }],
        },
      ],
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],

  // Global timeout per test
  timeout: 30_000,
  expect: { timeout: 8_000 },
});
