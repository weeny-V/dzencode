import type { InventoryCurrency } from '@/shared/api/types';

/** Unsupported or repeated URL values deliberately fall back to UAH; REST rejects them. */
export const parseCurrency = (value: string | string[] | undefined): InventoryCurrency =>
  value === 'USD' ? 'USD' : 'UAH';
