// Rules shared by client/ and server/. Each package imports this and appends it LAST,
// so Prettier's config wins over any stylistic rule.
import prettier from 'eslint-config-prettier/flat';
import importPlugin from 'eslint-plugin-import';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

export const sharedConfig = [
  {
    files: ['**/*.{ts,tsx,mjs}'],
    plugins: { import: importPlugin, 'simple-import-sort': simpleImportSort },
    rules: {
      // `_`-prefixed names are intentionally unused (e.g. Express error handlers need 4 params).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],

      // Import discipline. Sorting only changes order, formatting stays with Prettier.
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'import/no-duplicates': 'error',

      // Safety net.
      eqeqeq: ['error', 'always'],
      'no-console': ['error', { allow: ['info', 'warn', 'error'] }],

      // docs/CODING_RULES.md: async/await with try/catch instead of promise chains.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name=/^(then|catch|finally)$/]",
          message: 'Use async/await with try/catch instead of promise chains.',
        },
      ],
    },
  },
  {
    // Rules that need type information; `.mjs` config files are not part of tsconfig.
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
    },
  },
  prettier,
];
