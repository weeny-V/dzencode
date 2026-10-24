import { NotFoundError } from '../../shared/errors.js';
import type { ProductsService } from '../products/index.js';
import type { OrdersRepository } from './orders.repository.js';
import type { Order, OrderDetails, OrderInput, OrderSummary } from './orders.types.js';

interface OrdersServiceDeps {
  repository: OrdersRepository;
  products: Pick<ProductsService, 'listByOrder' | 'summarizeByOrder'>;
}

export const createOrdersService = ({ repository, products }: OrdersServiceDeps) => ({
  async list(): Promise<OrderSummary[]> {
    const [orders, summaries] = await Promise.all([repository.list(), products.summarizeByOrder()]);
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
