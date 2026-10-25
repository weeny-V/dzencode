// Public interface of the module: other modules import only from this file.
import type { ReadDatabase } from '../../shared/db/pool.js';
import { createProductTypesRepository } from './productTypes.repository.js';
import { createProductTypesRouter } from './productTypes.routes.js';
import { createProductTypesService } from './productTypes.service.js';

export const createProductTypesModule = ({ pool }: { pool: ReadDatabase }) => {
  const service = createProductTypesService(createProductTypesRepository(pool));
  return { service, router: createProductTypesRouter(service) };
};

export type { ProductTypesService } from './productTypes.service.js';
export type { ProductType } from './productTypes.types.js';
