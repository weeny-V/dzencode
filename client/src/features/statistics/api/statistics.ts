import { getJson } from '@/shared/api/server';
import type { InventoryCurrency, InventoryStatistics } from '@/shared/api/types';

export const getInventoryStatistics = (
  currency: InventoryCurrency,
  signal?: AbortSignal,
): Promise<InventoryStatistics> =>
  getJson(`/statistics/inventory?currency=${currency}`, { tags: ['statistics'], signal });
