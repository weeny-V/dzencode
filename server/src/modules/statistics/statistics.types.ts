import type { InventoryCurrency } from '../products/index.js';

export interface InventoryStatistics {
  currency: InventoryCurrency;
  ordersCount: number;
  productsCount: number;
  value: number;
  missingPrices: number;
  byType: { type: string; productsCount: number }[];
  byWarehouse: {
    warehouseId: number | null;
    name: string | null;
    productsCount: number;
    value: number;
    missingPrices: number;
  }[];
}
