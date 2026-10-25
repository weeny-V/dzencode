import { PageHeader } from '@/shared/ui/PageHeader';
import { ListSkeleton } from '@/shared/ui/Skeleton';

import { text } from '../OrdersContent/messages.server';
export async function Loading() {
  const t = await text();
  return (
    <>
      <PageHeader title={t('title')} add={{ label: t('add'), href: '/orders/new' }} />
      <ListSkeleton rows={6} rowHeight="4.5rem" label={t('loading')} />
    </>
  );
}
