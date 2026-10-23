'use client';

import { getHealth } from '@/api/health';
import { type RequestStatus, useRequest } from '@/hooks/useRequest';

export type ApiStatus = 'checking' | 'up' | 'down';

const statusByRequest: Record<RequestStatus, ApiStatus> = {
  loading: 'checking',
  success: 'up',
  error: 'down',
};

/** Maps the health request state to a status that is ready to render. */
export function useApiStatus(): ApiStatus {
  const { status } = useRequest(getHealth);
  return statusByRequest[status];
}
