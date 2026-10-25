import 'server-only';

import { readSession } from './session.server';
import { rawRequest } from './transport.server';

/** Protected server REST transport. Cookie credentials never leave the Next server. */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  init?.signal?.throwIfAborted();
  const { token } = await readSession();
  const headers = new Headers(init?.headers);
  headers.set('Authorization', 'Bearer ' + token);
  return await rawRequest<T>(path, { ...init, headers });
}

export const postJson = <T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> =>
  request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
    ...(signal ? { signal } : {}),
  });

export const deleteRequest = (path: string, signal?: AbortSignal): Promise<void> =>
  request<void>(path, { method: 'DELETE', cache: 'no-store', ...(signal ? { signal } : {}) });
