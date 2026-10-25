import { queryGraphql } from '@/shared/api/graphql.server';
import type { InventoryCurrency, InventoryGraph, InventoryStatistics } from '@/shared/api/types';

const INVENTORY_STATISTICS = `
  query ($currency: Currency!) {
    inventoryStatistics(currency: $currency) {
      currency ordersCount productsCount value missingPrices
      byType { type productsCount }
      byWarehouse { warehouseId name productsCount value missingPrices }
    }
  }`;

const INVENTORY_GRAPH = `
  query {
    inventoryGraph {
      ordersTotal ordersShown
      nodes { id kind label productsCount }
      edges { id source target productsCount }
    }
  }`;

export const getInventoryStatistics = async (
  currency: InventoryCurrency,
  signal?: AbortSignal,
): Promise<InventoryStatistics> =>
  (
    await queryGraphql<{ inventoryStatistics: InventoryStatistics }>(
      INVENTORY_STATISTICS,
      { currency },
      { tags: ['statistics'], ...(signal ? { signal } : {}) },
    )
  ).inventoryStatistics;

export const getInventoryGraph = async (signal?: AbortSignal): Promise<InventoryGraph> =>
  (
    await queryGraphql<{ inventoryGraph: InventoryGraph }>(
      INVENTORY_GRAPH,
      {},
      { tags: ['statistics'], ...(signal ? { signal } : {}) },
    )
  ).inventoryGraph;
