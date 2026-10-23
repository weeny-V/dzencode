'use client';

import { env } from '@/config/env';

import { type ApiStatus as Status, useApiStatus } from './useApiStatus';

interface ApiStatusViewProps {
  status: Status;
  apiUrl: string;
}

// Presentational: props in, markup out. Small enough to live in the same file as its container.
function ApiStatusView({ status, apiUrl }: ApiStatusViewProps) {
  return (
    <p data-testid="api-status">
      API: <strong>{status}</strong> ({apiUrl})
    </p>
  );
}

// Container: gets data from the hook and passes it down.
export default function ApiStatus() {
  const status = useApiStatus();
  return <ApiStatusView status={status} apiUrl={env.apiUrl} />;
}
