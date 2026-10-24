import { request } from '@/shared/api/http';

export interface Health {
  status: 'ok';
  uptime: number;
}

export const getHealth = (signal?: AbortSignal): Promise<Health> =>
  request<Health>('/health', { signal });
