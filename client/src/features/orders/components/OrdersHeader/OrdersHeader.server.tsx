import { Suspense } from 'react';

import { loadOrError } from '@/shared/api/server';
import { parseSearch, type SearchParams } from '@/shared/lib/searchParams';
import { PageHeader } from '@/shared/ui/PageHeader';

import { getOrders } from '../../api/orders';
import { ExportOrdersControl } from '../ExportOrders/ExportOrders.server';
import { text } from '../OrdersContent/messages.server';

/** The number of orders found, streamed into the title once the list has been read (the read is shared). */
async function OrdersCount({ searchParams }: { searchParams: SearchParams }) {
  const query = parseSearch((await searchParams).q);
  const result = await loadOrError(() => getOrders(query));
  return result.ok ? <span className="page-header__count"> / {result.data.length}</span> : null;
}

/**
 * The title row of the orders page. It sits outside the list's Suspense boundary, so the title is painted with
 * the first chunk of HTML and does not change when the list arrives (only the count is added to it).
 */
export async function OrdersHeader({ searchParams }: { searchParams: SearchParams }) {
  const t = await text();
  return (
    <PageHeader
      title={t('title')}
      add={{ label: t('add'), href: '/orders/new' }}
      countSlot={
        <Suspense fallback={null}>
          <OrdersCount searchParams={searchParams} />
        </Suspense>
      }
    >
      <ExportOrdersControl />
    </PageHeader>
  );
}
