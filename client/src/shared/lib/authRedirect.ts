/** Accept only this app's protected routes, never an external or protocol-relative address. */
export function safeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048) return '/orders';
  try {
    let decoded = value;
    for (let pass = 0; pass < 3; pass += 1) {
      if (
        !decoded.startsWith('/') ||
        decoded.startsWith('//') ||
        /[\\\u0000-\u001f\u007f]/.test(decoded)
      )
        return '/orders';
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    const url = new URL(value, 'http://inventory.local');
    if (
      url.origin !== 'http://inventory.local' ||
      !/^\/(?:orders(?:\/new)?|products(?:\/new)?|users|groups|settings)?$/.test(url.pathname)
    )
      return '/orders';
    return url.pathname === '/' ? '/orders' : url.pathname + url.search;
  } catch {
    return '/orders';
  }
}

export const loginHref = (returnTo: unknown) =>
  '/login?returnTo=' + encodeURIComponent(safeReturnTo(returnTo));
