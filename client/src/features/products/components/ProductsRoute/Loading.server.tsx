import { PageHeader } from '@/shared/ui/PageHeader';
import { ListSkeleton } from '@/shared/ui/Skeleton';

import { text } from '../ProductsContent/messages.server';
export async function Loading() {
  const t = await text();
  return (
    <>
      <PageHeader title={t('title')} />
      <ListSkeleton rows={8} rowHeight="3.6rem" label={t('loading')} />
    </>
  );
}
