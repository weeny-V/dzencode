import { ForeignKeyViolationError } from '../../shared/db/errors.js';
import { ValidationError } from '../../shared/errors.js';
import type { ProductTypesService } from '../product-types/index.js';
import { ORDER_FOREIGN_KEY, type ProductsRepository } from './products.repository.js';
import type {
  OrderProductsSummary,
  Product,
  ProductFilter,
  ProductInput,
} from './products.types.js';

interface ProductsServiceDeps {
  repository: ProductsRepository;
  productTypes: Pick<ProductTypesService, 'resolveId'>;
}

export const createProductsService = ({ repository, productTypes }: ProductsServiceDeps) => ({
  list: (filter: ProductFilter = {}): Promise<Product[]> => repository.list(filter),

  listByOrder: (orderId: number): Promise<Product[]> => repository.list({ orderId }),

  summarizeByOrder: (): Promise<Map<number, OrderProductsSummary>> => repository.summarizeByOrder(),

  async create(input: ProductInput): Promise<Product> {
    const { type, ...rest } = input;
    const typeId = await productTypes.resolveId(type);

    let id: number;
    try {
      id = await repository.create({ ...rest, typeId });
    } catch (error) {
      // The database is the judge of whether the order exists: no race between a check and the insert.
      if (error instanceof ForeignKeyViolationError && error.constraint === ORDER_FOREIGN_KEY) {
        throw new ValidationError(`Unknown order: ${input.order}`);
      }
      throw error;
    }

    const [created] = await repository.list({ id });
    if (!created) throw new Error(`Product ${id} disappeared right after insert`);
    return created;
  },
});

export type ProductsService = ReturnType<typeof createProductsService>;
