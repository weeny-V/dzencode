import { ListSkeleton } from '@/shared/ui/Skeleton';

import { text } from '../OrdersContent/messages.server';

/** The placeholder of the list; the title row is already on the page (see `OrdersHeader`). */
export async function Loading() {
  const t = await text();
  return <ListSkeleton rows={6} rowHeight="4.5rem" label={t('loading')} />;
}
