import { ForeignKeyViolationError } from '../../shared/db/errors.js';
import { NotFoundError, ValidationError } from '../../shared/errors.js';
import type { EventBus } from '../../shared/events/eventBus.js';
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
  events: Pick<EventBus, 'publish'>;
  productTypes: Pick<ProductTypesService, 'resolveId'>;
}

export const createProductsService = ({
  repository,
  productTypes,
  events,
}: ProductsServiceDeps) => ({
  list: (filter: ProductFilter = {}): Promise<Product[]> => repository.list(filter),

  listByOrder: (orderId: number): Promise<Product[]> => repository.list({ orderId }),

  async remove(id: number): Promise<void> {
    // The order is read first: the event must say which order lost a product, and the row is gone afterwards.
    const [existing] = await repository.list({ id });
    const removed = await repository.remove(id);
    if (!removed) throw new NotFoundError('Product not found');
    if (existing)
      events.publish({ type: 'product.deleted', productId: id, orderId: existing.order });
  },

  /** Orders that have a product matching the search text (by its title or serial number). */
  findOrderIdsByQuery: (query: string): Promise<number[]> => repository.findOrderIdsByQuery(query),

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
    events.publish({ type: 'product.created', productId: id, orderId: created.order });
    return created;
  },
});

export type ProductsService = ReturnType<typeof createProductsService>;
