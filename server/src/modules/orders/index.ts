// Public interface of the module: other modules import only from this file.
import type { Pool } from '../../shared/db/pool.js';
import type { ProductsService } from '../products/index.js';
import { createOrdersRepository } from './orders.repository.js';
import { createOrdersRouter } from './orders.routes.js';
import { createOrdersService } from './orders.service.js';

interface OrdersModuleDeps {
  pool: Pool;
  products: Pick<ProductsService, 'listByOrder' | 'summarizeByOrder'>;
}

export const createOrdersModule = ({ pool, products }: OrdersModuleDeps) => {
  const service = createOrdersService({ repository: createOrdersRepository(pool), products });
  return { service, router: createOrdersRouter(service) };
};

export type { OrdersService } from './orders.service.js';
export type { Order, OrderDetails, OrderSummary } from './orders.types.js';
