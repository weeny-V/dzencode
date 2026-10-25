'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { useCsvExport } from '@/shared/hooks/useCsvExport';
import type { Locale } from '@/shared/i18n/config';
import { parseSearch } from '@/shared/lib/searchParams';
import { ExportButton, type ExportLabels } from '@/shared/ui/ExportButton';

import { loadOrdersExport } from '../../actions';
import type { OrdersCsvHeaders, OrdersCsvPayload } from '../../exportCsv';

/** Exports the orders of the current search as CSV. The document is built in a Web Worker. */
export function ExportOrders({
  locale,
  labels,
  headers,
}: {
  locale: Locale;
  labels: ExportLabels;
  headers: OrdersCsvHeaders;
}) {
  const query = parseSearch(useSearchParams().get('q') ?? undefined);
  const load = useCallback(async () => {
    const result = await loadOrdersExport(query);
    return result.ok
      ? {
          ok: true as const,
          data: { locale, headers, data: result.data } satisfies OrdersCsvPayload,
        }
      : result;
  }, [headers, locale, query]);
  const createWorker = useCallback(
    () =>
      new Worker(new URL('../../workers/ordersCsv.worker.ts', import.meta.url), { type: 'module' }),
    [],
  );
  const filename = useCallback(() => `orders-${new Date().toISOString().slice(0, 10)}.csv`, []);
  const { status, start, cancel } = useCsvExport({ load, createWorker, filename });
  const stable = useMemo(() => labels, [labels]);
  return <ExportButton status={status} labels={stable} onStart={start} onCancel={cancel} />;
}
