import { getJson } from '@/shared/api/server';
import type { Warehouse } from '@/shared/api/types';

export const getWarehouses = (signal?: AbortSignal): Promise<Warehouse[]> =>
  getJson('/warehouses', { tags: ['warehouses'], signal });
