import { Suspense } from 'react';

import { DeleteDialogHost } from '@/features/confirmation';
import { parseSearch, type SearchParams } from '@/shared/lib/searchParams';
import { PageHeader } from '@/shared/ui/PageHeader';
import { ListSkeleton } from '@/shared/ui/Skeleton';

import { deleteProduct } from '../../actions';
import { parseTypeParam } from '../../searchParams';
import { ProductsContent } from '../ProductsContent/ProductsContent.server';

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
      <Suspense
        fallback={
          <>
            <PageHeader title="Продукты" />
            <ListSkeleton rows={8} rowHeight="3.6rem" label="Загрузка продуктов…" />
          </>
        }
      >
        <ProductsRequest searchParams={searchParams} />
      </Suspense>
      <Suspense>
        <DeleteDialogHost deleteProduct={deleteProduct} />
      </Suspense>
    </>
  );
}
