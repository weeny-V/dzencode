import 'server-only';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { env } from '@/shared/config/env';
import { loginHref } from '@/shared/lib/authRedirect';

import type { CurrentSession } from './authTypes';
import { ApiError } from './errors';
import { rawRequest } from './transport.server';

export const AUTH_COOKIE_NAME = 'dzencode_auth';
export const AUTH_COOKIE_AGE = 365 * 24 * 60 * 60;

// React.cache is request-scoped only. No credentials or auth results enter the persistent Data Cache.
const verifySession = cache(async (token: string) => {
  const session = await rawRequest<CurrentSession>('/auth/me', {
    headers: { Authorization: 'Bearer ' + token },
    signal: AbortSignal.timeout(env.apiReadTimeoutMs),
  });
  if (
    !/^[a-f0-9]{64}$/.test(session.sessionId) ||
    !Number.isInteger(session.user?.id) ||
    session.user.id < 1
  )
    throw new ApiError(502, 'Invalid authentication response');
  return { ...session, token };
});

export async function readSession() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token || token.length > 4096) throw new ApiError(401, 'Authentication required');
  return await verifySession(token);
}

export async function redirectToLogin(): Promise<never> {
  const returnTo = (await headers()).get('x-inventory-return-to');
  redirect(loginHref(returnTo));
}

export async function requireSession() {
  try {
    return await readSession();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return await redirectToLogin();
    throw error;
  }
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: env.authCookieSecure,
    maxAge: AUTH_COOKIE_AGE,
  });
}

export async function clearSessionCookie() {
  (await cookies()).set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: env.authCookieSecure,
    maxAge: 0,
  });
}
