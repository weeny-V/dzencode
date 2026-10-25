// The only place that reads process.env in client/src, including its Next server code.
// NEXT_PUBLIC_* values are inlined into the bundle at build time.
export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  apiReadTimeoutMs: 10_000,
  get serverApiUrl() {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  },
} as const;
