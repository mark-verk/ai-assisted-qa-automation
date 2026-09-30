import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL: process.env.DIDAXIS_URL,
    navigationTimeout: 30_000,
    actionTimeout: 15_000,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Fixes the "unsupported command-line flag" stability warning */
    launchOptions: {
      ignoreDefaultArgs: ['--enable-automation'],
      args: ['--disable-blink-features=AutomationControlled'],
    },
  },

  /* Use installed Chrome/Edge instead of Playwright-bundled Chromium (set PLAYWRIGHT_BROWSER_CHANNEL=msedge for Edge). */
  projects: [
    {
      name: process.env.PLAYWRIGHT_BROWSER_CHANNEL === 'msedge' ? 'msedge' : 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL === 'msedge' ? 'msedge' : 'chrome',
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
