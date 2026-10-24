// Public interface of the module: other modules import only from this file.
import type { Pool } from '../../shared/db/pool.js';
import type { ProductTypesService } from '../product-types/index.js';
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

export type { ProductsService } from './products.service.js';
export type { OrderProductsSummary, Price, Product } from './products.types.js';
