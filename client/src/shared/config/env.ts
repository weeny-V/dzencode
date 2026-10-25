// The only place that reads process.env in client/src, including its Next server code.
// NEXT_PUBLIC_* values are inlined into the bundle at build time.
export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  apiReadTimeoutMs: 10_000,
  get authCookieSecure() {
    const value = process.env.AUTH_COOKIE_SECURE;
    if (value !== undefined && value !== 'true' && value !== 'false')
      throw new Error('AUTH_COOKIE_SECURE must be true or false');
    return value === undefined ? process.env.NODE_ENV === 'production' : value === 'true';
  },
  get serverApiUrl() {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  },
} as const;
