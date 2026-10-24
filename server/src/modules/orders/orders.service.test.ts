import { describe, expect, it, vi } from 'vitest';

import { NotFoundError } from '../../shared/errors.js';
import type { Product } from '../products/index.js';
import type { OrdersRepository } from './orders.repository.js';
import { createOrdersService } from './orders.service.js';
import type { Order } from './orders.types.js';

// The service is tested with fakes: no database, no HTTP.

const order = (id: number): Order => ({
  id,
  title: `Order ${id}`,
  description: null,
  date: new Date('2020-01-01T00:00:00Z'),
});

const setup = (orders: Order[]) => {
  // Kept as a standalone mock so the assertions below do not read a method off the repository object.
  const list = vi.fn((_search?: Parameters<OrdersRepository['list']>[0]) =>
    Promise.resolve(orders),
  );
  const repository: OrdersRepository = {
    list,
    findById: vi.fn((id: number) => Promise.resolve(orders.find((item) => item.id === id))),
    create: vi.fn((input) => Promise.resolve({ id: 99, ...input })),
    remove: vi.fn((id: number) => Promise.resolve(orders.some((item) => item.id === id))),
  };
  const products = {
    listByOrder: vi.fn(() => Promise.resolve([{ id: 1 } as Product])),
    findOrderIdsByQuery: vi.fn(() => Promise.resolve([2])),
    summarizeByOrder: vi.fn(() =>
      Promise.resolve(
        new Map([
          [1, { productsCount: 2, totals: [{ value: 5, symbol: 'USD', isDefault: true }] }],
        ]),
      ),
    ),
  };
  return { list, products, service: createOrdersService({ repository, products }) };
};

describe('OrdersService', () => {
  it('fills counts and totals from the products module, zeros for orders without products', async () => {
    const { service } = setup([order(1), order(2)]);

    const list = await service.list();

    expect(list[0]).toMatchObject({ id: 1, productsCount: 2 });
    expect(list[0]?.totals).toHaveLength(1);
    expect(list[1]).toMatchObject({ id: 2, productsCount: 0, totals: [] });
  });

  it('lists without a search through the plain query and does not ask the products module', async () => {
    const { service, list, products } = setup([order(1)]);

    await service.list();

    expect(list).toHaveBeenCalledWith();
    expect(products.findOrderIdsByQuery).not.toHaveBeenCalled();
  });

  it('passes the orders whose products matched together with the text to the repository', async () => {
    const { service, list, products } = setup([order(1), order(2)]);

    await service.list({ query: 'mon' });

    expect(products.findOrderIdsByQuery).toHaveBeenCalledWith('mon');
    expect(list).toHaveBeenCalledWith({ query: 'mon', matchingIds: [2] });
  });

  it('returns an order with its products', async () => {
    const { service, products } = setup([order(1)]);

    const details = await service.get(1);

    expect(details.products).toHaveLength(1);
    expect(products.listByOrder).toHaveBeenCalledWith(1);
  });

  it('throws NotFoundError for an unknown order and does not load products', async () => {
    const { service, products } = setup([order(1)]);

    await expect(service.get(7)).rejects.toBeInstanceOf(NotFoundError);
    expect(products.listByOrder).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when removing an unknown order', async () => {
    const { service } = setup([order(1)]);

    await expect(service.remove(7)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.remove(1)).resolves.toBeUndefined();
  });
});
