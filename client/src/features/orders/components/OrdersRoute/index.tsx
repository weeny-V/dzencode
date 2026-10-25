import { Suspense } from 'react';

import { DeleteDialogHost } from '@/features/confirmation';
import { deleteProduct } from '@/features/products';
import { parseSearch, type SearchParams } from '@/shared/lib/searchParams';
import { PageHeader } from '@/shared/ui/PageHeader';
import { ListSkeleton } from '@/shared/ui/Skeleton';

import { deleteOrder } from '../../actions';
import { parseOrderId } from '../../searchParams';
import { OrdersContent } from '../OrdersContent/OrdersContent.server';

/**
 * Resolve the address inside Suspense, keeping the route shell synchronous without promise chains.
 */
async function OrdersRequest({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  return <OrdersContent selectedId={parseOrderId(params.order)} query={parseSearch(params.q)} />;
}

export function OrdersRoute({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <Suspense
        fallback={
          <>
            <PageHeader title="Приходы" add={{ label: 'Добавить приход', href: '/orders/new' }} />
            <ListSkeleton rows={6} rowHeight="4.5rem" label="Загрузка приходов…" />
          </>
        }
      >
        <OrdersRequest searchParams={searchParams} />
      </Suspense>
      <Suspense>
        <DeleteDialogHost deleteOrder={deleteOrder} deleteProduct={deleteProduct} />
      </Suspense>
    </>
  );
}
