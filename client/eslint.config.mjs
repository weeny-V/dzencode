import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import tseslint from 'typescript-eslint';

import { sharedConfig } from '../eslint.shared.mjs';

// Layers (see docs/CODING_RULES.md): app -> features -> shared.
// Inside a feature: components -> hooks -> api. Cross-layer imports use the `@/` alias,
// imports inside one feature are relative, so patterns can match on folder names.
const restrict = (...patterns) => ({
  '@typescript-eslint/no-restricted-imports': ['error', { patterns }],
});

const app = {
  group: ['@/app', '@/app/*'],
  message: 'Nothing imports from app/: it only composes.',
};
const features = {
  group: ['@/features', '@/features/*'],
  message: 'shared/ is the lowest layer and knows nothing about features.',
};
const deepFeature = {
  group: ['@/features/*/*'],
  message: "Import another feature only through its index.ts ('@/features/<name>').",
};
const components = {
  group: ['**/components', '**/components/*'],
  message: 'Lower layers must not import components.',
};
const hooks = {
  group: ['**/hooks', '**/hooks/*'],
  message: 'api/ and config/ must not import hooks.',
};
const api = { group: ['**/api', '**/api/*'], message: 'config/ must not import api/.' };
const apiForComponents = {
  group: ['**/api', '**/api/*'],
  allowTypeImports: true,
  message: 'Components get data from hooks; only types may come from api/.',
};

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Type-aware rules (no-floating-promises, no-misused-promises, ...).
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  // Config files are not part of the type-aware setup.
  { files: ['**/*.mjs'], extends: [tseslint.configs.disableTypeChecked] },

  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/shared/config/env.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: 'Read environment variables only in src/shared/config/env.ts.',
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/api/**'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Network requests live in api/ folders.' },
      ],
    },
  },

  // Later blocks override earlier ones for the files they match, so each lists its full pattern set.
  { files: ['src/app/**/*.{ts,tsx}'], rules: restrict(deepFeature) },

  // Feature files that sit outside the layers below (index.ts, types, store).
  { files: ['src/features/**/*.{ts,tsx}'], rules: restrict(app, deepFeature) },
  {
    // Components get data from hooks. A hook next to its component (use*.ts) may call api/.
    files: ['src/features/*/components/**/*.{ts,tsx}'],
    ignores: ['**/use*.ts'],
    rules: restrict(apiForComponents, app, deepFeature),
  },
  {
    files: ['src/features/*/hooks/**/*.{ts,tsx}'],
    rules: restrict(components, app, deepFeature),
  },
  {
    files: ['src/features/*/api/**/*.{ts,tsx}'],
    rules: restrict(components, hooks, app, deepFeature),
  },

  { files: ['src/shared/**/*.{ts,tsx}'], rules: restrict(features, app) },
  { files: ['src/shared/hooks/**/*.{ts,tsx}'], rules: restrict(features, app, components) },
  { files: ['src/shared/api/**/*.{ts,tsx}'], rules: restrict(features, app, hooks, components) },
  {
    files: ['src/shared/config/**/*.{ts,tsx}'],
    rules: restrict(features, app, components, hooks, api),
  },

  ...sharedConfig,
  globalIgnores(['.next/**', 'out/**', 'next-env.d.ts']),
]);
