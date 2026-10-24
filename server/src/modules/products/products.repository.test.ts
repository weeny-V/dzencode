// Integration tests of what only the database can guarantee (see shared/testing/database.ts).
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { ForeignKeyViolationError } from '../../shared/db/errors.js';
import { count, createTestContext, resetData } from '../../shared/testing/database.js';
import { createProductsRepository, ORDER_FOREIGN_KEY } from './products.repository.js';
import type { NewProduct } from './products.types.js';

const { pool } = createTestContext();
const repository = createProductsRepository(pool);

const product: NewProduct = {
  title: 'Keyboard',
  serialNumber: 555,
  isNew: false,
  photo: null,
  typeId: 1,
  specification: null,
  guarantee: { start: new Date('2020-05-01T00:00:00Z'), end: new Date('2021-05-01T00:00:00Z') },
  price: [{ value: 10, symbol: 'USD', isDefault: true }],
  order: 3,
  date: new Date('2020-05-01T00:00:00Z'),
};

beforeEach(() => resetData(pool));

afterAll(async () => {
  await pool.end();
});

describe('ProductsRepository.create', () => {
  it('stores the product and its prices', async () => {
    const id = await repository.create(product);

    expect(id).toBeGreaterThan(0);
    expect(await count(pool, 'products')).toBe(4);
    expect(await count(pool, 'product_prices')).toBe(7);
  });

  it('rolls the product row back when a later price insert fails', async () => {
    // Two rows with the same currency break the unique key AFTER the product row was inserted.
    const duplicatePrices = [
      { value: 1, symbol: 'USD', isDefault: true },
      { value: 2, symbol: 'USD', isDefault: false },
    ];

    await expect(repository.create({ ...product, price: duplicatePrices })).rejects.toThrow();

    expect(await count(pool, 'products')).toBe(3);
    expect(await count(pool, 'product_prices')).toBe(6);
  });

  it('reports an unknown order as a typed foreign key error', async () => {
    let error: unknown;
    try {
      await repository.create({ ...product, order: 999 });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ForeignKeyViolationError);
    expect((error as ForeignKeyViolationError).constraint).toBe(ORDER_FOREIGN_KEY);
  });
});

describe('database constraints', () => {
  it('refuses a guarantee that ends before it starts, even when the API check is bypassed', async () => {
    await expect(
      pool.query(
        `INSERT INTO products
           (serial_number, is_new, title, type_id, guarantee_start, guarantee_end, order_id, date)
         VALUES (1, true, 'Bad', 1, '2021-01-01 00:00:00', '2020-01-01 00:00:00', 1, '2020-01-01 00:00:00')`,
      ),
    ).rejects.toThrow(/chk_products_guarantee_period/);
  });
});
