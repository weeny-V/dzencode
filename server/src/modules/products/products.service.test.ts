import { describe, expect, it, vi } from 'vitest';

import { ForeignKeyViolationError } from '../../shared/db/errors.js';
import { NotFoundError, ValidationError } from '../../shared/errors.js';
import { ORDER_FOREIGN_KEY, type ProductsRepository } from './products.repository.js';
import { createProductsService } from './products.service.js';
import type { Product, ProductInput } from './products.types.js';

// The service is tested with fakes: no database, no HTTP.

const input: ProductInput = {
  title: 'Monitor',
  serialNumber: 1,
  isNew: true,
  photo: null,
  type: 'Monitors',
  specification: null,
  guarantee: { start: new Date('2020-01-01'), end: new Date('2021-01-01') },
  price: [{ value: 1, symbol: 'USD', isDefault: true }],
  order: 5,
  date: new Date('2020-01-01'),
};

const setup = (create: ProductsRepository['create']) => {
  const stored = { id: 10, title: 'Monitor', order: 5 } as Product;
  const publish = vi.fn();
  // Kept as standalone mocks so the assertions below do not read methods off the repository object.
  const list = vi.fn(() => Promise.resolve([stored]));
  const createMock = vi.fn(create);
  const removeMock = vi.fn((id: number) => Promise.resolve(id === 10));
  const repository: ProductsRepository = {
    list,
    create: createMock,
    remove: removeMock,
    findOrderIdsByQuery: () => Promise.resolve([]),
    summarizeByOrder: () => Promise.resolve(new Map()),
  };
  const productTypes = {
    resolveId: vi.fn((name: string) =>
      name === 'Monitors'
        ? Promise.resolve(3)
        : Promise.reject(new ValidationError(`Unknown product type: ${name}`)),
    ),
  };
  return {
    list,
    publish,
    create: createMock,
    remove: removeMock,
    service: createProductsService({ repository, productTypes, events: { publish } }),
  };
};

describe('ProductsService.create', () => {
  it('resolves the type id, stores the product and returns it', async () => {
    const { service, create, list } = setup(() => Promise.resolve(10));

    const product = await service.create(input);

    expect(product).toMatchObject({ id: 10 });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ typeId: 3 }));
    expect(create).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'Monitors' }));
    expect(list).toHaveBeenCalledWith({ id: 10 });
  });

  it('fails for an unknown type without touching the repository', async () => {
    const { service, create } = setup(() => Promise.resolve(10));

    await expect(service.create({ ...input, type: 'Nope' })).rejects.toThrow(
      'Unknown product type: Nope',
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('turns an order foreign key violation into a ValidationError', async () => {
    const { service } = setup(() =>
      Promise.reject(new ForeignKeyViolationError(ORDER_FOREIGN_KEY)),
    );

    await expect(service.create(input)).rejects.toThrow(new ValidationError('Unknown order: 5'));
  });

  it('rethrows other errors untouched', async () => {
    const failure = new Error('connection lost');
    const { service } = setup(() => Promise.reject(failure));

    await expect(service.create(input)).rejects.toBe(failure);
  });
});

describe('ProductsService.remove', () => {
  it('removes an existing product', async () => {
    const { service, remove } = setup(() => Promise.resolve(10));

    await expect(service.remove(10)).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledWith(10);
  });

  it('throws NotFoundError for an unknown product', async () => {
    const { service } = setup(() => Promise.resolve(10));

    await expect(service.remove(11)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ProductsService events', () => {
  it('announces a created product with its order after the insert', async () => {
    const { service, publish } = setup(() => Promise.resolve(10));
    await service.create(input);
    expect(publish).toHaveBeenCalledOnce();
    expect(publish).toHaveBeenCalledWith({ type: 'product.created', productId: 10, orderId: 5 });
  });
  it('announces nothing when the insert fails', async () => {
    const { service, publish } = setup(() => Promise.reject(new Error('db down')));
    await expect(service.create(input)).rejects.toThrow('db down');
    expect(publish).not.toHaveBeenCalled();
  });
  it('announces a removed product with the order it belonged to', async () => {
    const { service, publish } = setup(() => Promise.resolve(10));
    await service.remove(10);
    expect(publish).toHaveBeenCalledWith({ type: 'product.deleted', productId: 10, orderId: 5 });
  });
  it('announces nothing for an unknown product', async () => {
    const { service, publish } = setup(() => Promise.resolve(10));
    await expect(service.remove(11)).rejects.toBeInstanceOf(NotFoundError);
    expect(publish).not.toHaveBeenCalled();
  });
});
