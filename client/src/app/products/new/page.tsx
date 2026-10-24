import type { Metadata } from 'next';

import { NewProductContainer } from '@/features/products';
import { parsePositiveInt, type SearchParams } from '@/shared/lib/searchParams';
import { PageTransition } from '@/shared/ui/PageTransition';

export const metadata: Metadata = { title: 'Новый продукт' };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { order } = await searchParams;

  return (
    <PageTransition>
      <NewProductContainer orderId={parsePositiveInt(order)} />
    </PageTransition>
  );
}
