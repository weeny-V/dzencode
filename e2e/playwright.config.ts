import path from 'node:path';

import { defineConfig } from '@playwright/test';

import { baseURL } from './settings';

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  outputDir: '../test-results/e2e',
  reporter: [
    ['list'],
    ['html', { outputFolder: path.resolve(__dirname, '../playwright-report'), open: 'never' }],
  ],
  use: {
    baseURL,
    viewport: { width: 1365, height: 900 },
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
