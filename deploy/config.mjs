/** Non-secret deployment wiring; application env remains in each package's configuration layer. */
export function deploymentConfig(env) {
  const port = Number(env.PORT ?? 10000);
  if (!Number.isInteger(port) || port < 1024 || port > 65535 || [3000, 4000].includes(port)) {
    throw new Error('PORT must be an unprivileged public port, distinct from 3000 and 4000');
  }
  const value = env.PUBLIC_ORIGIN ?? env.RENDER_EXTERNAL_URL;
  if (!value) throw new Error('PUBLIC_ORIGIN or RENDER_EXTERNAL_URL is required');
  const url = new URL(value);
  if (url.origin !== value || !['https:', 'http:'].includes(url.protocol)) {
    throw new Error(
      'The public origin must contain only an HTTP(S) scheme, hostname and optional port',
    );
  }
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error('A public deployment requires HTTPS');
  }
  return { port, origin: url.origin };
}
