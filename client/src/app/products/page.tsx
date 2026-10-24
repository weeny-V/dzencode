import type { Metadata } from 'next';

import { ProductsRoute } from '@/features/products';
import type { SearchParams } from '@/shared/lib/searchParams';
import { PageTransition } from '@/shared/ui/PageTransition';

export const metadata: Metadata = { title: 'Продукты' };

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageTransition>
      <ProductsRoute searchParams={searchParams} />
    </PageTransition>
  );
}
