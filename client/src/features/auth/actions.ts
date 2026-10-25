'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';

import type { SessionIdentity } from '@/shared/api/authTypes';
import { ApiError } from '@/shared/api/errors';
import { clearSessionCookie, readSession, setSessionCookie } from '@/shared/api/session.server';
import type { ActionResult } from '@/shared/lib/actionResult';
import { safeReturnTo } from '@/shared/lib/authRedirect';

import { authenticate, revokeSession } from './api/auth.server';
import { loginSchema, registrationSchema } from './schema';

export async function submitCredentials(
  mode: 'login' | 'register',
  input: unknown,
  returnTo: unknown,
): Promise<ActionResult<{ returnTo: string }>> {
  if (mode !== 'login' && mode !== 'register') return { ok: false, error: 'invalidInput' };
  const parsed = (mode === 'register' ? registrationSchema : loginSchema).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalidInput' };
  try {
    const response = await authenticate(mode, parsed.data);
    await setSessionCookie(response.token);
    revalidatePath('/', 'layout');
    return { ok: true, data: { returnTo: safeReturnTo(returnTo) } };
  } catch (error) {
    unstable_rethrow(error);
    const code =
      error instanceof ApiError
        ? (
            {
              400: 'invalidInput',
              401: 'invalidCredentials',
              409: 'emailTaken',
              429: 'rateLimited',
            } as Record<number, string>
          )[error.status]
        : undefined;
    return { ok: false, error: code ?? 'unavailable' };
  }
}

export async function logout(expectedSessionId: string): Promise<ActionResult<void>> {
  try {
    const session = await readSession();
    if (session.sessionId !== expectedSessionId)
      return { ok: false, error: 'changed', authenticationRequired: true };
    await revokeSession(session.token);
    await clearSessionCookie();
    revalidatePath('/', 'layout');
    return { ok: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ApiError && error.status === 401) {
      await clearSessionCookie();
      revalidatePath('/', 'layout');
      return { ok: true, data: undefined };
    }
    return { ok: false, error: 'unavailable' };
  }
}

export async function inspectSession(): Promise<ActionResult<SessionIdentity | null>> {
  try {
    const session = await readSession();
    return { ok: true, data: { userId: session.user.id, sessionId: session.sessionId } };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ApiError && error.status === 401) return { ok: true, data: null };
    return { ok: false, error: 'unavailable' };
  }
}
