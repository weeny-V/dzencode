'use client';

import { useContext } from 'react';

import { AuthSessionContext } from '@/shared/ui/AuthSessionProvider';

export function useAuthSession() {
  const session = useContext(AuthSessionContext);
  if (!session) throw new Error('Authenticated content requires AuthSessionProvider');
  return session;
}
