import 'server-only';

import type { AuthUser } from '@/shared/api/authTypes';
import { rawRequest } from '@/shared/api/transport.server';

import type { LoginValues, RegistrationValues } from '../schema';

export const authenticate = (mode: 'login' | 'register', input: LoginValues | RegistrationValues) =>
  rawRequest<{ user: AuthUser; token: string }>('/auth/' + mode, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

export const revokeSession = (token: string) =>
  rawRequest<void>('/auth/logout', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
  });
