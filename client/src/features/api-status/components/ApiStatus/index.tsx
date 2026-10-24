'use client';

import './ApiStatus.scss';

import { env } from '@/shared/config/env';

import { type ApiStatus as Status, useApiStatus } from './useApiStatus';

const LABELS: Record<Status, string> = {
  checking: 'проверка…',
  up: 'работает',
  down: 'недоступен',
};

interface ApiStatusViewProps {
  status: Status;
  apiUrl: string;
}

// Presentational: props in, markup out. Small enough to live in the same file as its container.
function ApiStatusView({ status, apiUrl }: ApiStatusViewProps) {
  return (
    <p className={`api-status api-status--${status}`} data-testid="api-status" title={apiUrl}>
      <span className="api-status__dot" aria-hidden="true" />
      API: {LABELS[status]}
    </p>
  );
}

// Container: gets data from the hook and passes it down.
export default function ApiStatus() {
  const status = useApiStatus();
  return <ApiStatusView status={status} apiUrl={env.apiUrl} />;
}
