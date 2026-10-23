import path from 'node:path';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Self-contained server bundle for a small Docker image.
  output: 'standalone',
  // The app lives in a monorepo: trace dependencies from the repo root.
  outputFileTracingRoot: path.join(__dirname, '..'),
  poweredByHeader: false,
};

export default nextConfig;
