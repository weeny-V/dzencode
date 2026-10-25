'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import { useCsvExport } from '@/shared/hooks/useCsvExport';
import type { Locale } from '@/shared/i18n/config';
import { parseSearch } from '@/shared/lib/searchParams';
import { ExportButton, type ExportLabels } from '@/shared/ui/ExportButton';

import { loadProductsExport } from '../../actions';
import type { ProductsCsvHeaders, ProductsCsvPayload } from '../../exportCsv';
import { parseTypeParam } from '../../searchParams';

/** Exports the products of the current type filter and search as CSV. The document is built in a Web Worker. */
export function ExportProducts({
  locale,
  labels,
  headers,
}: {
  locale: Locale;
  labels: ExportLabels;
  headers: ProductsCsvHeaders;
}) {
  const params = useSearchParams();
  const query = parseSearch(params.get('q') ?? undefined);
  const type = parseTypeParam(params.get('type') ?? undefined);
  const load = useCallback(async () => {
    const result = await loadProductsExport(type, query);
    return result.ok
      ? {
          ok: true as const,
          data: { locale, headers, products: result.data } satisfies ProductsCsvPayload,
        }
      : result;
  }, [headers, locale, query, type]);
  const createWorker = useCallback(
    () =>
      new Worker(new URL('../../workers/productsCsv.worker.ts', import.meta.url), {
        type: 'module',
      }),
    [],
  );
  const filename = useCallback(() => `products-${new Date().toISOString().slice(0, 10)}.csv`, []);
  const { status, start, cancel } = useCsvExport({ load, createWorker, filename });
  return <ExportButton status={status} labels={labels} onStart={start} onCancel={cancel} />;
}
