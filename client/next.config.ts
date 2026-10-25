import path from 'node:path';

import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  // Self-contained server bundle for a small Docker image.
  output: 'standalone',
  // The app lives in a monorepo: trace dependencies from the repo root.
  outputFileTracingRoot: path.join(__dirname, '..'),
  poweredByHeader: false,
  headers: () =>
    Promise.resolve([
      {
        // A stale service worker file would keep an old version alive: the browser must always ask for it.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
    ]),
  sassOptions: {
    loadPaths: [
      // `@use 'tokens' as *;` works from any component stylesheet.
      path.join(__dirname, 'src/shared/styles'),
      // Bootstrap's own partials import each other by short name (`@import "variables-dark"`), which the
      // bundler's resolver cannot find from inside node_modules without this path.
      path.join(path.dirname(require.resolve('bootstrap/package.json')), 'scss'),
    ],
    // Bootstrap 5 is written with @import and global functions; silence the warnings it triggers.
    quietDeps: true,
    silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'],
  },
};

const withNextIntl = createNextIntlPlugin('./src/shared/i18n/request.ts');

export default withNextIntl(nextConfig);
