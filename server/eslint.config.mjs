import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { sharedConfig } from '../eslint.shared.mjs';

// Module boundaries (see docs/CODING_RULES.md):
// - mysql2 is used only by repositories, the pool and transactions (other files may import its types);
// - express is used only by routes, the composition root and shared/http (services stay HTTP-free);
// - a module reaches into another module only through that module's index.ts.
const mysql = {
  group: ['mysql2', 'mysql2/*'],
  allowTypeImports: true,
  message: 'Run queries only in *.repository.ts (the pool lives in shared/db/).',
};
const express = {
  group: ['express', 'express/*'],
  message: 'Express belongs to *.routes.ts, app.ts and shared/http/; keep services HTTP-free.',
};
const siblingInternals = {
  regex: '^\\.\\./[^./]+/[^/]+\\.(repository|routes|schemas|service|types)(\\.js)?$',
  message: "Import another module only through its index.ts (e.g. '../products/index.js').",
};

const restrict = (...patterns) => ({
  '@typescript-eslint/no-restricted-imports': ['error', { patterns }],
});

const sources = ['src/**/*.ts'];
const notTests = ['src/**/*.test.ts', 'src/shared/testing/**'];

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
    // Lets `import/no-cycle` follow NodeNext imports like './a.js' to a.ts.
    settings: {
      'import/parsers': { '@typescript-eslint/parser': ['.ts'] },
      'import/resolver': { typescript: { project: './tsconfig.json' } },
    },
  },
  {
    files: sources,
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

  // Later blocks override earlier ones for the files they match, so each lists its full pattern set.
  { files: sources, ignores: notTests, rules: restrict(mysql, express) },
  {
    files: ['src/modules/**/*.ts'],
    ignores: notTests,
    rules: restrict(mysql, express, siblingInternals),
  },
  {
    files: ['src/modules/**/*.repository.ts'],
    ignores: notTests,
    rules: restrict(express, siblingInternals),
  },
  {
    files: ['src/modules/**/*.routes.ts'],
    ignores: notTests,
    rules: restrict(mysql, siblingInternals),
  },
  { files: ['src/shared/db/**/*.ts'], ignores: notTests, rules: restrict(express) },
  { files: ['src/shared/http/**/*.ts', 'src/app.ts'], ignores: notTests, rules: restrict(mysql) },

  ...sharedConfig,
);
