'use client';

import './ApiStatus.scss';

import { useTranslations } from 'next-intl';

import { env } from '@/shared/config/env';

import { type ApiStatus as Status, useApiStatus } from './useApiStatus';

interface ApiStatusViewProps {
  status: Status;
  apiUrl: string;
  label: string;
}

// Presentational: props in, markup out. Small enough to live in the same file as its container.
function ApiStatusView({ status, apiUrl, label }: ApiStatusViewProps) {
  return (
    <p className={`api-status api-status--${status}`} data-testid="api-status" title={apiUrl}>
      <span className="api-status__dot" aria-hidden="true" />
      API: {label}
    </p>
  );
}

// Container: gets data from the hook and passes it down.
export default function ApiStatus() {
  const t = useTranslations('ApiStatus');
  const status = useApiStatus();
  return <ApiStatusView status={status} apiUrl={env.apiUrl} label={t(status)} />;
}
