import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import tseslint from 'typescript-eslint';

import { sharedConfig } from '../eslint.shared.mjs';

// Layers go top-down: app -> components -> hooks -> api -> config (see docs/CODING_RULES.md).
// Cross-layer imports use the `@/` alias, so patterns match on the layer folder name.
const layerImports = (patterns) => ({
  '@typescript-eslint/no-restricted-imports': ['error', { patterns }],
});

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
    ignores: ['src/config/env.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: 'Read environment variables only in src/config/env.ts.',
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/api/**'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Network requests live in src/api/.' },
      ],
    },
  },

  {
    // Components get data from hooks. A hook next to its component (use*.ts) may call api/.
    files: ['src/components/**/*.{ts,tsx}'],
    ignores: ['**/use*.ts'],
    rules: layerImports([
      {
        group: ['**/api', '**/api/*'],
        allowTypeImports: true,
        message: 'Components get data from hooks; only types may come from api/.',
      },
      { group: ['**/app', '**/app/*'], message: 'Components must not import from app/.' },
    ]),
  },
  {
    files: ['src/hooks/**/*.{ts,tsx}'],
    rules: layerImports([
      {
        group: ['**/components', '**/components/*'],
        message: 'hooks/ must not import components.',
      },
      { group: ['**/app', '**/app/*'], message: 'hooks/ must not import from app/.' },
    ]),
  },
  {
    files: ['src/api/**/*.{ts,tsx}'],
    rules: layerImports([
      { group: ['**/components', '**/components/*'], message: 'api/ must not import components.' },
      { group: ['**/hooks', '**/hooks/*'], message: 'api/ must not import hooks.' },
      { group: ['**/app', '**/app/*'], message: 'api/ must not import from app/.' },
    ]),
  },
  {
    files: ['src/config/**/*.{ts,tsx}'],
    rules: layerImports([
      {
        group: ['**/app', '**/app/*', '**/components', '**/components/*', '**/hooks', '**/hooks/*'],
        message: 'config/ is the lowest layer and imports nothing from the layers above.',
      },
      { group: ['**/api', '**/api/*'], message: 'config/ must not import api/.' },
    ]),
  },

  ...sharedConfig,
  globalIgnores(['.next/**', 'out/**', 'next-env.d.ts']),
]);
