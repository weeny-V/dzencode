import { ListSkeleton } from '@/shared/ui/Skeleton';

import { text } from '../ProductsContent/messages.server';

/** The placeholder of the list; the title row is already on the page (see `ProductsHeader`). */
export async function Loading() {
  const t = await text();
  return <ListSkeleton rows={8} rowHeight="3.6rem" label={t('loading')} />;
}
