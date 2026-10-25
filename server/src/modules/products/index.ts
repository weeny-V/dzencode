// Public interface of the module: other modules import only from this file.
import type { Pool, ReadDatabase } from '../../shared/db/pool.js';
import type { ProductTypesService } from '../product-types/index.js';
import { createProductsInventoryRepository } from './products.inventory.repository.js';
import { createProductsInventoryService } from './products.inventory.service.js';
import { createProductsRepository } from './products.repository.js';
import { createProductsRouter } from './products.routes.js';
import { createProductsService } from './products.service.js';

interface ProductsModuleDeps {
  pool: Pool;
  productTypes: Pick<ProductTypesService, 'resolveId'>;
}

export const createProductsModule = ({ pool, productTypes }: ProductsModuleDeps) => {
  const service = createProductsService({
    repository: createProductsRepository(pool),
    productTypes,
  });
  return { service, router: createProductsRouter(service) };
};

export type { ProductsInventoryService } from './products.inventory.service.js';
export type { ProductsService } from './products.service.js';
export const createProductsInventoryReader = (database: ReadDatabase) =>
  createProductsInventoryService({ repository: createProductsInventoryRepository(database) });
export type { OrderProductsSummary, Price, Product } from './products.types.js';
export type { InventoryCurrency, InventoryGroup } from './products.types.js';
