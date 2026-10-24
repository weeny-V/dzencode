// Integration tests: HTTP -> service -> repository -> real MySQL test database (see shared/testing/database.ts).
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { count, createTestContext, resetData } from '../../shared/testing/database.js';
import type { Product } from './index.js';

const { app, pool } = createTestContext();

beforeEach(() => resetData(pool));

afterAll(async () => {
  await pool.end();
});

describe('GET /products', () => {
  it('lists all products with their order title', async () => {
    const res = await request(app).get('/products');
    const products = res.body as Product[];

    expect(res.status).toBe(200);
    expect(products.map((product) => product.id)).toEqual([1, 2, 3]);
    expect(products[2]).toMatchObject({ order: 2, orderTitle: 'Order B' });
  });

  it('filters by type', async () => {
    const res = await request(app).get('/products').query({ type: 'Monitors' });

    expect((res.body as Product[]).map((product) => product.id)).toEqual([1, 3]);
  });

  it('returns an empty list for a type without products', async () => {
    const res = await request(app).get('/products').query({ type: 'Unknown' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('compares the type name case-insensitively (the column collation is *_ai_ci)', async () => {
    const res = await request(app).get('/products').query({ type: 'monitors' });

    expect((res.body as Product[]).map((product) => product.id)).toEqual([1, 3]);
  });

  it('searches the title, the serial number, the type and the order title', async () => {
    const found = async (q: string) =>
      ((await request(app).get('/products').query({ q })).body as Product[]).map(
        (product) => product.id,
      );

    expect(await found('laptop')).toEqual([2]);
    expect(await found('SN-333')).toEqual([3]);
    expect(await found('monitors')).toEqual([1, 3]);
    expect(await found('order b')).toEqual([3]);
    expect(await found('nothing like this')).toEqual([]);
  });

  it('combines the search with the type filter', async () => {
    const res = await request(app).get('/products').query({ type: 'Monitors', q: 'order a' });

    expect((res.body as Product[]).map((product) => product.id)).toEqual([1]);
  });

  it('treats % and _ as plain characters', async () => {
    expect((await request(app).get('/products').query({ q: '%' })).body).toEqual([]);
    expect((await request(app).get('/products').query({ q: 'Monitor_1' })).body).toEqual([]);
  });

  it('rejects a repeated search parameter', async () => {
    expect((await request(app).get('/products?q=a&q=b')).status).toBe(400);
  });

  it('rejects a repeated type parameter', async () => {
    const res = await request(app).get('/products?type=a&type=b');

    expect(res.status).toBe(400);
  });
});

describe('POST /products', () => {
  const newProduct = {
    title: 'Keyboard',
    serialNumber: 555,
    isNew: false,
    type: 'Laptops',
    guarantee: { start: '2020-05-01T00:00:00Z', end: '2021-05-01T00:00:00Z' },
    price: [
      { value: 10, symbol: 'USD', isDefault: false },
      { value: 260, symbol: 'UAH', isDefault: true },
    ],
    order: 3,
  };

  it('creates a product with its prices', async () => {
    const res = await request(app).post('/products').send(newProduct);
    const product = res.body as Product;

    expect(res.status).toBe(201);
    expect(product).toMatchObject({
      title: 'Keyboard',
      type: 'Laptops',
      order: 3,
      orderTitle: 'Empty order',
    });
    expect(product.price).toEqual(newProduct.price);
    expect(await count(pool, 'products')).toBe(4);
    expect(await count(pool, 'product_prices')).toBe(8);
  });

  it('rejects an unknown product type and stores nothing', async () => {
    const res = await request(app)
      .post('/products')
      .send({ ...newProduct, type: 'Nope' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Unknown product type: Nope' });
    expect(await count(pool, 'products')).toBe(3);
  });

  it('rejects an unknown order and stores nothing', async () => {
    const res = await request(app)
      .post('/products')
      .send({ ...newProduct, order: 999 });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Unknown order: 999' });
    expect(await count(pool, 'products')).toBe(3);
    expect(await count(pool, 'product_prices')).toBe(6);
  });

  it('treats the currency code case-insensitively: usd is stored as USD', async () => {
    const price = [{ value: 5, symbol: 'usd', isDefault: true }];
    const res = await request(app)
      .post('/products')
      .send({ ...newProduct, price });

    expect(res.status).toBe(201);
    expect((res.body as Product).price).toEqual([{ value: 5, symbol: 'USD', isDefault: true }]);
  });

  it.each([
    ['serialNumber above INT', { serialNumber: 3_000_000_000 }],
    ['order above INT', { order: 99_999_999_999 }],
    ['price above DECIMAL(12,2)', { price: [{ value: 1e20, symbol: 'USD', isDefault: true }] }],
    ['price with 3 decimals', { price: [{ value: 0.001, symbol: 'USD', isDefault: true }] }],
    [
      'usd and USD together',
      {
        price: [
          { value: 1, symbol: 'USD', isDefault: true },
          { value: 2, symbol: 'usd', isDefault: false },
        ],
      },
    ],
    ['specification above TEXT size', { specification: '😀'.repeat(20_000) }],
    ['a year above 9999', { date: '+010000-01-01T00:00:00Z' }],
  ])('answers 400, not 500, for %s', async (_name, patch) => {
    const res = await request(app)
      .post('/products')
      .send({ ...newProduct, ...patch });

    expect(res.status).toBe(400);
    expect(await count(pool, 'products')).toBe(3);
    expect(await count(pool, 'product_prices')).toBe(6);
  });

  it('rejects two default prices', async () => {
    const price = newProduct.price.map((item) => ({ ...item, isDefault: true }));
    const res = await request(app)
      .post('/products')
      .send({ ...newProduct, price });

    expect(res.status).toBe(400);
    expect(await count(pool, 'products')).toBe(3);
  });
});

describe('DELETE /products/:id', () => {
  it('deletes the product together with its prices and keeps the order', async () => {
    const res = await request(app).delete('/products/1');

    expect(res.status).toBe(204);
    expect(await count(pool, 'products')).toBe(2);
    expect(await count(pool, 'product_prices')).toBe(4);
    expect(await count(pool, 'orders')).toBe(3);
    expect((await request(app).get('/orders/1')).status).toBe(200);
  });

  it('is reflected in the counts and totals of the order', async () => {
    await request(app).delete('/products/1');

    const orders = (await request(app).get('/orders')).body as {
      id: number;
      productsCount: number;
      totals: { symbol: string; value: number }[];
    }[];

    expect(orders.find((order) => order.id === 1)).toMatchObject({
      productsCount: 1,
      totals: [
        { symbol: 'UAH', value: 26000 },
        { symbol: 'USD', value: 1000 },
      ],
    });
  });

  it('returns 404 for an unknown product and deletes nothing', async () => {
    const res = await request(app).delete('/products/999');

    expect(res.status).toBe(404);
    expect(await count(pool, 'products')).toBe(3);
  });

  it('returns 400 for an id that is not a positive integer', async () => {
    const res = await request(app).delete('/products/abc');

    expect(res.status).toBe(400);
    expect(await count(pool, 'products')).toBe(3);
  });
});
