'use client';

import './SessionsCounter.scss';

import { useTranslations } from 'next-intl';

import { UsersIcon } from '@/shared/ui/icons';

import type { SessionsState } from '../../store/sessionsSlice';
import { useSessionsCounter } from './useSessionsCounter';

/** The sentence for the tooltip and screen readers; the visible part is only the icon and the number. */
const describeConnection = (
  { connection, count }: SessionsState,
  t: (key: string) => string,
): string => {
  if (connection === 'online') return count === undefined ? t('connected') : t('active');
  return connection === 'connecting' ? t('connecting') : t('offline');
};

/** The number of open tabs of the app, live. Shows a dash while there is no connection. */
export function SessionsCounter() {
  const t = useTranslations('SessionsCounter');
  const sessions = useSessionsCounter();
  const label = describeConnection(sessions, t);
  const value = sessions.count === undefined ? '—' : String(sessions.count);

  return (
    <div
      className={`sessions-counter sessions-counter--${sessions.connection}`}
      title={sessions.count === undefined ? label : `${label} ${value}`}
    >
      <UsersIcon className="sessions-counter__icon" />
      <span className="visually-hidden">{label} </span>
      <span className="sessions-counter__value">{value}</span>
    </div>
  );
}
