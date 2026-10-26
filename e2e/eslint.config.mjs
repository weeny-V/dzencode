import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { sharedConfig } from '../eslint.shared.mjs';

export default tseslint.config(
  { ignores: ['**/playwright-report/**', '**/test-results/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: globals.node,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    settings: {
      'import/resolver': { typescript: { project: 'e2e/tsconfig.json' } },
    },
  },
  {
    files: ['**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
  ...sharedConfig,
);
