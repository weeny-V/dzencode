import { OrdersRoute } from '@/features/orders';
import { pageMetadata } from '@/shared/i18n/metadata';
import type { SearchParams } from '@/shared/lib/searchParams';
import { PageTransition } from '@/shared/ui/PageTransition';

import { text } from './messages.server';

export const generateMetadata = () => pageMetadata(text);

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageTransition>
      <OrdersRoute searchParams={searchParams} />
    </PageTransition>
  );
}
