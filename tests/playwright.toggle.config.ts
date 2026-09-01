import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

/**
 * Isolated config for wohnungen-toggle.spec.ts.
 *
 * That spec renames page files on disk, which changes what the server delivers for
 * everyone. It must therefore run alone: single worker, no parallelism, one browser.
 * The default config excludes it via `testIgnore`; this config runs only that file.
 *
 * Usage: npm run test:toggle
 */
export default defineConfig({
  ...base,
  // Override the default config's exclusion — here we want exactly this one spec
  testIgnore: [],
  testMatch: /wohnungen-toggle\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  // No retries: a retry would re-run file mutations and muddy the picture
  retries: 0,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
