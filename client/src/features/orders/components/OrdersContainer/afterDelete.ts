import { toQuery } from '@/shared/lib/searchParams';

/** What the orders page shows right now: the address as it is at the moment, not as it was when a request began. */
export interface PageContext {
  selectedId: number | undefined;
  query: string;
}

/**
 * Where to go after order `deletedId` was deleted: to the list without a panel when that order's panel is the one
 * open now, otherwise nowhere (the visitor has moved on to another order or the list, and stays there).
 */
export const hrefAfterOrderDeleted = (
  deletedId: number,
  { selectedId, query }: PageContext,
): string | undefined => (deletedId === selectedId ? `/orders${toQuery({ q: query })}` : undefined);
