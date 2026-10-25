import type { OrdersInventoryService } from '../orders/index.js';
import type { ProductTypesService } from '../product-types/index.js';
import type { InventoryCurrency, ProductsInventoryService } from '../products/index.js';
import type { WarehousesService } from '../warehouses/index.js';
import type { InventoryStatistics } from './statistics.types.js';

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
});

export type StatisticsService = ReturnType<typeof createStatisticsService>;
