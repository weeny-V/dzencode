import 'server-only';

import { unstable_rethrow } from 'next/navigation';

import type { ActionResult } from '@/shared/lib/actionResult';

import { ApiError } from './errors';
import { readSession } from './session.server';

/** Actions report authentication loss explicitly; framework control-flow exceptions must escape. */
export async function mutateOrError<T>(
  run: () => Promise<T>,
  expectedSessionId?: string,
): Promise<ActionResult<T>> {
  try {
    const session = await readSession();
    if (expectedSessionId !== undefined && expectedSessionId !== session.sessionId)
      throw new ApiError(401, 'Authentication changed');
    return { ok: true, data: await run() };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ApiError && error.status === 401)
      return { ok: false, error: 'Authentication required', authenticationRequired: true };
    return { ok: false, error: error instanceof Error ? error.message : 'Request failed' };
  }
}
