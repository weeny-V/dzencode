import { Suspense } from 'react';

import { confirmationMessages, DeleteDialogHost } from '@/features/confirmation';
import { deleteProduct } from '@/features/products';
import { MessageScope } from '@/shared/i18n/MessageScope.server';
import { parseSearch, type SearchParams } from '@/shared/lib/searchParams';

import { deleteOrder } from '../../actions';
import { parseOrderId } from '../../searchParams';
import { OrdersContent } from '../OrdersContent/OrdersContent.server';
import { OrdersHeader } from '../OrdersHeader/OrdersHeader.server';
import { Loading } from './Loading.server';

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
      <OrdersHeader searchParams={searchParams} />
      <Suspense fallback={<Loading />}>
        <OrdersRequest searchParams={searchParams} />
      </Suspense>
      <Suspense>
        <MessageScope load={confirmationMessages}>
          <DeleteDialogHost deleteOrder={deleteOrder} deleteProduct={deleteProduct} />
        </MessageScope>
      </Suspense>
    </>
  );
}
