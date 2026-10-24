import path from 'node:path';
import process from 'node:process';

import { defineConfig } from 'vitest/config';

// Dates are shown in UTC and the clock in local time: run the tests in a time zone far from UTC (+14), so a
// function that wrongly uses the local zone cannot pass by luck on a machine that happens to be on UTC.
process.env.TZ = 'Pacific/Kiritimati';

export default defineConfig({
  resolve: {
    // Same `@/` alias as in tsconfig.json.
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  test: {
    // Pure functions only for now: no DOM needed.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
