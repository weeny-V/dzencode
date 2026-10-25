import { Suspense } from 'react';

import { NewProductContent, NewProductLoading } from '@/features/products';
import { pageMetadata } from '@/shared/i18n/metadata';
import { parsePositiveInt, type SearchParams } from '@/shared/lib/searchParams';
import { PageTransition } from '@/shared/ui/PageTransition';

import { text } from './messages.server';

export const generateMetadata = () => pageMetadata(text);

async function NewProductRequest({ searchParams }: { searchParams: SearchParams }) {
  const { order } = await searchParams;
  return <NewProductContent orderId={parsePositiveInt(order)} />;
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageTransition>
      <Suspense fallback={<NewProductLoading />}>
        <NewProductRequest searchParams={searchParams} />
      </Suspense>
    </PageTransition>
  );
}
