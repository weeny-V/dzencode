import { ValidationError } from '../../shared/errors.js';
import type { ProductTypesRepository } from './productTypes.repository.js';
import type { ProductType } from './productTypes.types.js';

export const createProductTypesService = (repository: ProductTypesRepository) => ({
  list: (): Promise<ProductType[]> => repository.list(),

  /** Resolves a type name used in another entity's input; an unknown name is the caller's mistake. */
  async resolveId(name: string): Promise<number> {
    const id = await repository.findIdByName(name);
    if (id === undefined) throw new ValidationError(`Unknown product type: ${name}`);
    return id;
  },
});

export type ProductTypesService = ReturnType<typeof createProductTypesService>;
