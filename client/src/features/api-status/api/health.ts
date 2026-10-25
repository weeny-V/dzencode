import { ApiError, errorMessage } from '@/shared/api/errors';
import { env } from '@/shared/config/env';

export interface Health {
  status: 'ok';
  uptime: number;
}

export async function getHealth(signal?: AbortSignal): Promise<Health> {
  const response = await fetch(`${env.apiUrl}/health`, { signal, cache: 'no-store' });
  if (!response.ok) throw new ApiError(response.status, await errorMessage(response));
  return (await response.json()) as Health;
}
