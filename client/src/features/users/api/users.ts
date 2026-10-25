import type { Participant } from '@/shared/api/authTypes';
import { request } from '@/shared/api/http';
import { env } from '@/shared/config/env';

/** Participants and current-user identity are always uncached. */
export const getParticipants = () =>
  request<Participant[]>('/users', {
    cache: 'no-store',
    signal: AbortSignal.timeout(env.apiReadTimeoutMs),
  });
