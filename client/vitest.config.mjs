import path from 'node:path';
import process from 'node:process';

import { defineConfig } from 'vitest/config';

// Dates are shown in UTC and the clock in local time: run the tests in a time zone far from UTC (+14), so a
// function that wrongly uses the local zone cannot pass by luck on a machine that happens to be on UTC.
process.env.TZ = 'Pacific/Kiritimati';

export default defineConfig({
  // Test files may contain JSX.
  esbuild: { jsx: 'automatic' },
  resolve: {
    // Same `@/` alias as in tsconfig.json.
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      'server-only': path.resolve(import.meta.dirname, 'src/testing/server-only.ts'),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/**/*.dom.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/**/*.dom.test.{ts,tsx}'],
          setupFiles: ['src/testing/setup-dom.ts'],
        },
      },
    ],
  },
});
