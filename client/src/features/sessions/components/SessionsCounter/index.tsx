'use client';

import './SessionsCounter.scss';

import { UsersIcon } from '@/shared/ui/icons';

import type { SessionsState } from '../../store/sessionsSlice';
import { useSessionsCounter } from './useSessionsCounter';

/** The sentence for the tooltip and screen readers; the visible part is only the icon and the number. */
const describeConnection = ({ connection, count }: SessionsState): string => {
  if (connection === 'online') return count === undefined ? 'Подключено' : 'Активных сессий:';
  return connection === 'connecting' ? 'Подключение…' : 'Нет связи с сервером';
};

/** The number of open tabs of the app, live. Shows a dash while there is no connection. */
export function SessionsCounter() {
  const sessions = useSessionsCounter();
  const label = describeConnection(sessions);
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
