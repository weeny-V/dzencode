import { PageHeader } from '@/shared/ui/PageHeader';
import { ListSkeleton } from '@/shared/ui/Skeleton';

import { text } from '../ProductForm/messages.server';
export async function NewProductLoading() {
  const t = await text();
  return (
    <>
      <PageHeader title={t('title')} />
      <ListSkeleton rows={4} rowHeight="3.4rem" label={t('loading')} />
    </>
  );
}
