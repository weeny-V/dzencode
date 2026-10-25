import type { OrderProductsSummary, Product } from '../products/index.js';
import type { Warehouse } from '../warehouses/index.js';

export interface Order {
  id: number;
  title: string;
  description: string | null;
  date: Date;
  warehouseId: number | null;
}

export interface OrderInput {
  title: string;
  description: string | null;
  date: Date;
  warehouseId?: number | null;
}

export interface OrderFilter {
  /** Search text: found in the order title or in the title or serial number of one of its products. */
  query?: string;
}

/** An order in the list: product count and price totals are filled from the products module. */
export interface OrderSummary extends Order, OrderProductsSummary {}

export interface OrderDetails extends Order {
  products: Product[];
  warehouse: Warehouse | null;
}
