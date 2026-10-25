import type { ReadDatabase } from '../../shared/db/pool.js';
import { createWarehousesRepository } from './warehouses.repository.js';
import { createWarehousesRouter } from './warehouses.routes.js';
import { createWarehousesService } from './warehouses.service.js';

export const createWarehousesModule = ({ pool }: { pool: ReadDatabase }) => {
  const service = createWarehousesService({ repository: createWarehousesRepository(pool) });
  return { service, router: createWarehousesRouter(service) };
};

export type { WarehousesService } from './warehouses.service.js';
export type { Warehouse } from './warehouses.types.js';
