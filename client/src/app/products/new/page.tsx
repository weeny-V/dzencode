import type { Metadata } from 'next';
import { Suspense } from 'react';

import { NewProductContent } from '@/features/products';
import { parsePositiveInt, type SearchParams } from '@/shared/lib/searchParams';
import { PageHeader } from '@/shared/ui/PageHeader';
import { PageTransition } from '@/shared/ui/PageTransition';
import { ListSkeleton } from '@/shared/ui/Skeleton';

export const metadata: Metadata = { title: 'Новый продукт' };

async function NewProductRequest({ searchParams }: { searchParams: SearchParams }) {
  const { order } = await searchParams;
  return <NewProductContent orderId={parsePositiveInt(order)} />;
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageTransition>
      <Suspense
        fallback={
          <>
            <PageHeader title="Новый продукт" />
            <ListSkeleton rows={4} rowHeight="3.4rem" label="Загрузка формы…" />
          </>
        }
      >
        <NewProductRequest searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}
