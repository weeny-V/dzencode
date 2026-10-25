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

export type InventoryGraphNodeKind = 'WAREHOUSE' | 'ORDER' | 'PRODUCT_TYPE';

export interface InventoryGraphNode {
  id: string;
  kind: InventoryGraphNodeKind;
  /** Null for the unassigned-warehouse node: the client localizes it. */
  label: string | null;
  /** Products connected to the node inside the returned graph (see `ordersTotal` for truncation). */
  productsCount: number;
}

export interface InventoryGraphEdge {
  id: string;
  source: string;
  target: string;
  productsCount: number;
}

/** Warehouse -> order -> product type, limited to the orders with the most products. */
export interface InventoryGraph {
  nodes: InventoryGraphNode[];
  edges: InventoryGraphEdge[];
  ordersTotal: number;
  ordersShown: number;
}
