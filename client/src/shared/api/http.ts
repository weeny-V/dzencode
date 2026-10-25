import 'server-only';

import { env } from '@/shared/config/env';

import { ApiError, errorMessage } from './errors';

/**
 * Thin typed wrapper over fetch: base URL, JSON parsing and error mapping live here, not in components.
 * A 204 response (e.g. `DELETE /orders/:id`) has no body: call `request<void>(...)` for those.
 */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  init?.signal?.throwIfAborted();
  const res = await fetch(`${env.serverApiUrl}${path}`, init);
  // Next may serve a cached Response without running a native network fetch.
  init?.signal?.throwIfAborted();
  if (!res.ok) {
    const message = await errorMessage(res);
    init?.signal?.throwIfAborted();
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json()) as T;
  init?.signal?.throwIfAborted();
  return data;
}

/** `POST` with a JSON body; the answer is parsed like in `request`. */
export const postJson = <T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> =>
  request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
    ...(signal ? { signal } : {}),
  });

/** `DELETE`; the API answers 204 without a body. */
export const deleteRequest = (path: string, signal?: AbortSignal): Promise<void> =>
  request<void>(path, { method: 'DELETE', cache: 'no-store', ...(signal ? { signal } : {}) });
