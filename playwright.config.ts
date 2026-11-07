import { defineConfig, devices } from '@playwright/test';

const CI = Boolean(process.env['CI']);
const PORT = 4310;

/**
 * Chromium-based projects can use a browser that is already installed instead of downloading one:
 * `chrome` on the Linux runners, `msedge` on Windows. Unset, Playwright's own Chromium is used.
 */
const CHROMIUM_CHANNEL = process.env['E2E_CHROMIUM_CHANNEL'];
const chromium = CHROMIUM_CHANNEL ? { channel: CHROMIUM_CHANNEL } : {};

/**
 * End-to-end tests against the production build, served with the headers from vercel.json
 * (`scripts/serve-dist.mjs`). Build first: `pnpm e2e` does both.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  // Runners have 4 cores (3 on macOS); every test is independent, so use them all.
  workers: CI ? '100%' : '50%',
  timeout: 20_000,
  expect: { timeout: 5_000 },
  reporter: CI ? [['github'], ['html', { open: 'never' }], ['list']] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-first-failure',
    screenshot: 'only-on-failure',
    // The production service worker would cache the app between tests; the offline test opts in.
    serviceWorkers: 'block',
  },
  webServer: {
    command: `node scripts/serve-dist.mjs ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !CI,
    stdout: 'ignore',
  },
  projects: [
    { name: 'chrome', use: { ...devices['Desktop Chrome'], ...chromium } },
    { name: 'firefox', use: devices['Desktop Firefox'] },
    { name: 'safari', use: devices['Desktop Safari'] },
    { name: 'android', use: { ...devices['Pixel 7'], ...chromium } },
    { name: 'iphone', use: devices['iPhone 15'] },
    { name: 'ipad', use: devices['iPad Pro 11'] },
  ],
});
