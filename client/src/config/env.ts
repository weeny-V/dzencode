// The only place that reads process.env on the client.
// NEXT_PUBLIC_* values are inlined into the bundle at build time.
export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
} as const;
