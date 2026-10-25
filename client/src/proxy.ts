import { type NextRequest, NextResponse } from 'next/server';

import { loginHref } from '@/shared/lib/authRedirect';

/** Cheap navigation check only. REST reads and actions independently verify the active DB session. */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const protectedPath = /^\/(orders|products|users|groups|settings)(\/|$)/.test(path);
  if (
    protectedPath &&
    (request.method === 'GET' || request.method === 'HEAD') &&
    !request.cookies.get('dzencode_auth')?.value
  ) {
    return NextResponse.redirect(new URL(loginHref(path + request.nextUrl.search), request.url));
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-inventory-return-to', path + request.nextUrl.search);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
