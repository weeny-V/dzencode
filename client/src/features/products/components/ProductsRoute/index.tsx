import { Suspense } from 'react';

import { confirmationMessages, DeleteDialogHost } from '@/features/confirmation';
import { MessageScope } from '@/shared/i18n/MessageScope.server';
import { parseSearch, type SearchParams } from '@/shared/lib/searchParams';

import { deleteProduct } from '../../actions';
import { parseTypeParam } from '../../searchParams';
import { ProductsContent } from '../ProductsContent/ProductsContent.server';
import { ProductsHeader } from '../ProductsHeader/ProductsHeader.server';
import { Loading } from './Loading.server';

/**
 * Resolve the address inside Suspense, keeping the route shell synchronous without promise chains.
 */
async function ProductsRequest({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  return <ProductsContent typeParam={parseTypeParam(params.type)} query={parseSearch(params.q)} />;
}

export function ProductsRoute({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <ProductsHeader searchParams={searchParams} />
      <Suspense fallback={<Loading />}>
        <ProductsRequest searchParams={searchParams} />
      </Suspense>
      <Suspense>
        <MessageScope load={confirmationMessages}>
          <DeleteDialogHost deleteProduct={deleteProduct} />
        </MessageScope>
      </Suspense>
    </>
  );
}
