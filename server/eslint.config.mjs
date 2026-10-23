import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { sharedConfig } from '../eslint.shared.mjs';

export default tseslint.config(
  { ignores: ['dist'] },
  js.configs.recommended,
  // Type-aware rules (no-floating-promises, no-misused-promises, ...): important for async Express handlers.
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: globals.node,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  // Config files are not part of tsconfig, so skip type information for them.
  { files: ['**/*.mjs'], extends: [tseslint.configs.disableTypeChecked] },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/config.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: 'Read environment variables only in src/config.ts.',
        },
      ],
    },
  },
  ...sharedConfig,
);
