import { NotFoundError } from '../../shared/errors.js';
import type { ProductsService } from '../products/index.js';
import type { OrdersRepository } from './orders.repository.js';
import type { Order, OrderDetails, OrderFilter, OrderInput, OrderSummary } from './orders.types.js';

interface OrdersServiceDeps {
  repository: OrdersRepository;
  products: Pick<ProductsService, 'listByOrder' | 'summarizeByOrder' | 'findOrderIdsByQuery'>;
}

export const createOrdersService = ({ repository, products }: OrdersServiceDeps) => ({
  /** A search keeps whole orders: the counts and totals still describe all of an order's products. */
  async list({ query }: OrderFilter = {}): Promise<OrderSummary[]> {
    const orders =
      query === undefined
        ? await repository.list()
        : await repository.list({ query, matchingIds: await products.findOrderIdsByQuery(query) });
    const summaries = await products.summarizeByOrder();
    return orders.map((order) => ({
      ...order,
      productsCount: summaries.get(order.id)?.productsCount ?? 0,
      totals: summaries.get(order.id)?.totals ?? [],
    }));
  },

  async get(id: number): Promise<OrderDetails> {
    const order = await repository.findById(id);
    if (!order) throw new NotFoundError('Order not found');
    return { ...order, products: await products.listByOrder(id) };
  },

  async create(input: OrderInput): Promise<OrderSummary> {
    const order: Order = await repository.create(input);
    return { ...order, productsCount: 0, totals: [] };
  },

  async remove(id: number): Promise<void> {
    const removed = await repository.remove(id);
    if (!removed) throw new NotFoundError('Order not found');
  },
});

export type OrdersService = ReturnType<typeof createOrdersService>;
