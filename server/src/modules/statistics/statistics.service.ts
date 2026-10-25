import type { OrdersInventoryService } from '../orders/index.js';
import type { ProductTypesService } from '../product-types/index.js';
import type { InventoryCurrency, ProductsInventoryService } from '../products/index.js';
import type { WarehousesService } from '../warehouses/index.js';
import type { InventoryGraph, InventoryStatistics } from './statistics.types.js';

export const UNASSIGNED_WAREHOUSE_NODE = 'warehouse:none';

interface InventoryReaders {
  orders: OrdersInventoryService;
  products: ProductsInventoryService;
  warehouses: Pick<WarehousesService, 'list'>;
  productTypes: Pick<ProductTypesService, 'list'>;
}

interface StatisticsDeps {
  readSnapshot: <T>(read: (readers: InventoryReaders) => Promise<T>) => Promise<T>;
}

/** Aggregate only bounded groups, through the services that own the inventory. */
export const createStatisticsService = ({ readSnapshot }: StatisticsDeps) => ({
  async inventory(currency: InventoryCurrency): Promise<InventoryStatistics> {
    return readSnapshot(async ({ orders, products, warehouses, productTypes }) => {
      const [locations, groups, reference, types] = await Promise.all([
        orders.inventoryLocations(),
        products.inventoryGroups(currency),
        warehouses.list(),
        productTypes.list(),
      ]);
      const locationByOrder = new Map(locations.map((order) => [order.id, order.warehouseId]));
      const byType = new Map(
        types.map((type) => [type.name, { type: type.name, productsCount: 0 }]),
      );
      const byWarehouse = new Map<number | null, InventoryStatistics['byWarehouse'][number]>([
        ...reference.map(
          ({ id, name }) =>
            [id, { warehouseId: id, name, productsCount: 0, value: 0, missingPrices: 0 }] as const,
        ),
        [null, { warehouseId: null, name: null, productsCount: 0, value: 0, missingPrices: 0 }],
      ]);
      let productsCount = 0;
      let cents = 0;
      let missingPrices = 0;
      for (const group of groups) {
        productsCount += group.productsCount;
        cents += Math.round(group.value * 100);
        missingPrices += group.missingPrices;
        const type = byType.get(group.type) ?? { type: group.type, productsCount: 0 };
        type.productsCount += group.productsCount;
        byType.set(group.type, type);
        const warehouse = byWarehouse.get(locationByOrder.get(group.orderId) ?? null)!;
        warehouse.productsCount += group.productsCount;
        warehouse.value = (Math.round(warehouse.value * 100) + Math.round(group.value * 100)) / 100;
        warehouse.missingPrices += group.missingPrices;
      }
      return {
        currency,
        ordersCount: locations.length,
        productsCount,
        value: cents / 100,
        missingPrices,
        byType: [...byType.values()],
        byWarehouse: [...byWarehouse.values()],
      };
    });
  },

  /** Relations between warehouses, orders and product types, bounded to the busiest orders. */
  async graph(limit: number): Promise<InventoryGraph> {
    return readSnapshot(async ({ orders, products, warehouses }) => {
      const [locations, groups, reference] = await Promise.all([
        orders.inventoryLocations(),
        products.inventoryGroups('UAH'),
        warehouses.list(),
      ]);
      const typesByOrder = new Map<number, Map<string, number>>();
      const totalByOrder = new Map<number, number>();
      for (const group of groups) {
        const types = typesByOrder.get(group.orderId) ?? new Map<string, number>();
        types.set(group.type, (types.get(group.type) ?? 0) + group.productsCount);
        typesByOrder.set(group.orderId, types);
        totalByOrder.set(
          group.orderId,
          (totalByOrder.get(group.orderId) ?? 0) + group.productsCount,
        );
      }
      const shown = [...locations]
        .sort(
          (a, b) => (totalByOrder.get(b.id) ?? 0) - (totalByOrder.get(a.id) ?? 0) || a.id - b.id,
        )
        .slice(0, limit);
      const warehouseCounts = new Map<string, number>();
      const typeCounts = new Map<string, number>();
      const orderNodes: InventoryGraph['nodes'] = [];
      const edges: InventoryGraph['edges'] = [];
      for (const order of shown) {
        const orderId = `order:${order.id}`;
        const warehouseId =
          order.warehouseId === null ? UNASSIGNED_WAREHOUSE_NODE : `warehouse:${order.warehouseId}`;
        const total = totalByOrder.get(order.id) ?? 0;
        warehouseCounts.set(warehouseId, (warehouseCounts.get(warehouseId) ?? 0) + total);
        orderNodes.push({ id: orderId, kind: 'ORDER', label: order.title, productsCount: total });
        edges.push({
          id: `${warehouseId}>${orderId}`,
          source: warehouseId,
          target: orderId,
          productsCount: total,
        });
        for (const [type, count] of typesByOrder.get(order.id) ?? []) {
          const typeId = `type:${type}`;
          typeCounts.set(typeId, (typeCounts.get(typeId) ?? 0) + count);
          edges.push({
            id: `${orderId}>${typeId}`,
            source: orderId,
            target: typeId,
            productsCount: count,
          });
        }
      }
      const warehouseNodes: InventoryGraph['nodes'] = reference.map(({ id, name }) => ({
        id: `warehouse:${id}`,
        kind: 'WAREHOUSE',
        label: name,
        productsCount: warehouseCounts.get(`warehouse:${id}`) ?? 0,
      }));
      if (warehouseCounts.has(UNASSIGNED_WAREHOUSE_NODE))
        warehouseNodes.push({
          id: UNASSIGNED_WAREHOUSE_NODE,
          kind: 'WAREHOUSE',
          label: null,
          productsCount: warehouseCounts.get(UNASSIGNED_WAREHOUSE_NODE) ?? 0,
        });
      const typeNodes: InventoryGraph['nodes'] = [...typeCounts].map(([id, productsCount]) => ({
        id,
        kind: 'PRODUCT_TYPE',
        label: id.slice('type:'.length),
        productsCount,
      }));
      return {
        nodes: [...warehouseNodes, ...orderNodes, ...typeNodes],
        edges,
        ordersTotal: locations.length,
        ordersShown: shown.length,
      };
    });
  },
});

export type StatisticsService = ReturnType<typeof createStatisticsService>;
