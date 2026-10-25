// Public interface of the module: other modules import only from this file.
import type { Pool, ReadDatabase } from '../../shared/db/pool.js';
import type { EventBus } from '../../shared/events/eventBus.js';
import type { ProductsService } from '../products/index.js';
import type { WarehousesService } from '../warehouses/index.js';
import { createOrdersInventoryRepository } from './orders.inventory.repository.js';
import { createOrdersInventoryService } from './orders.inventory.service.js';
import { createOrdersRepository } from './orders.repository.js';
import { createOrdersRouter } from './orders.routes.js';
import { createOrdersService } from './orders.service.js';

interface OrdersModuleDeps {
  pool: Pool;
  events: Pick<EventBus, 'publish'>;
  warehouses: Pick<WarehousesService, 'list'>;
  products: Pick<ProductsService, 'listByOrder' | 'summarizeByOrder' | 'findOrderIdsByQuery'>;
}

export const createOrdersModule = ({ pool, products, warehouses, events }: OrdersModuleDeps) => {
  const service = createOrdersService({
    repository: createOrdersRepository(pool),
    events,
    products,
    warehouses,
  });
  return { service, router: createOrdersRouter(service) };
};

export type { OrdersInventoryService } from './orders.inventory.service.js';
export type { OrdersService } from './orders.service.js';
export const createOrdersInventoryReader = (database: ReadDatabase) =>
  createOrdersInventoryService({ repository: createOrdersInventoryRepository(database) });
export type { Order, OrderDetails, OrderSummary } from './orders.types.js';
