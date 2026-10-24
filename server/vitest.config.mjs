import process from 'node:process';

import { defineConfig } from 'vitest/config';

// `npm run dev` and `npm start` read server/.env; tests should see the same database settings.
try {
  process.loadEnvFile();
} catch {
  // The file is optional: defaults from src/config.ts apply without it.
}

export default defineConfig({
  test: {
    // The API tests share one test database, so test files run one after another.
    fileParallelism: false,
  },
});
