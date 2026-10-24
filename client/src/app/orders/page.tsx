import type { Metadata } from 'next';

import { OrdersRoute } from '@/features/orders';
import type { SearchParams } from '@/shared/lib/searchParams';
import { PageTransition } from '@/shared/ui/PageTransition';

export const metadata: Metadata = { title: 'Приходы' };

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageTransition>
      <OrdersRoute searchParams={searchParams} />
    </PageTransition>
  );
}
