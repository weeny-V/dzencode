import { env } from '@/shared/config/env';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

/** The API reports errors as `{ "error": "..." }`; fall back to the HTTP status line for anything else. */
const errorMessage = async (res: Response): Promise<string> => {
  try {
    const body = (await res.json()) as { error?: unknown };
    if (typeof body.error === 'string') return body.error;
  } catch {
    // Not JSON (e.g. a proxy error page): use the status line below.
  }
  return `${res.status} ${res.statusText}`;
};

/**
 * Thin typed wrapper over fetch: base URL, JSON parsing and error mapping live here, not in components.
 * A 204 response (e.g. `DELETE /orders/:id`) has no body: call `request<void>(...)` for those.
 */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${env.apiUrl}${path}`, init);
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
