// Integration tests: HTTP -> service -> repository -> real MySQL test database (see shared/testing/database.ts).
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestClient } from '../../shared/testing/auth.js';
import { count, createTestContext, resetData } from '../../shared/testing/database.js';
import type { OrderDetails, OrderSummary } from './index.js';

const { app, pool, auth } = createTestContext();
const { client, register } = createTestClient(app, auth);

beforeEach(async () => {
  await resetData(pool);
  await register();
});

afterAll(async () => {
  await pool.end();
});

describe('GET /orders', () => {
  it('lists orders, newest first, with product counts and totals per currency', async () => {
    const res = await client.get('/orders');
    const orders = res.body as OrderSummary[];

    expect(res.status).toBe(200);
    expect(orders.map((order) => order.id)).toEqual([3, 2, 1]);

    const orderA = orders.find((order) => order.id === 1);
    expect(orderA).toMatchObject({
      title: 'Order A',
      description: 'first',
      date: '2020-01-01T10:00:00.000Z',
      productsCount: 2,
    });
    expect(orderA?.totals).toEqual([
      { symbol: 'UAH', value: 28600, isDefault: true },
      { symbol: 'USD', value: 1100, isDefault: false },
    ]);

    expect(orders.find((order) => order.id === 3)).toMatchObject({ productsCount: 0, totals: [] });
  });
});

describe('GET /orders?q=', () => {
  const ids = async (query: Record<string, string>) => {
    const res = await client.get('/orders').query(query);
    return { status: res.status, ids: (res.body as OrderSummary[]).map((order) => order.id) };
  };

  it('finds an order by its title, ignoring letter case', async () => {
    expect(await ids({ q: 'order b' })).toEqual({ status: 200, ids: [2] });
  });

  it('finds the orders of a product by its title', async () => {
    // "Monitor" is in the titles of products 1 (order 1) and 3 (order 2); the order titles do not match.
    expect(await ids({ q: 'monitor' })).toEqual({ status: 200, ids: [2, 1] });
  });

  it('finds the order of a product by the serial number as the lists print it', async () => {
    expect(await ids({ q: 'sn-222' })).toEqual({ status: 200, ids: [1] });
  });

  it('does not look at the product type, only at titles and serial numbers', async () => {
    expect(await ids({ q: 'laptops' })).toEqual({ status: 200, ids: [] });
  });

  it('keeps the whole order: the counts and totals do not shrink to the matched products', async () => {
    const res = await client.get('/orders').query({ q: 'laptop' });

    expect((res.body as OrderSummary[]).map((order) => order.productsCount)).toEqual([2]);
  });

  it('treats % and _ as plain characters', async () => {
    expect(await ids({ q: '%' })).toEqual({ status: 200, ids: [] });
    expect(await ids({ q: 'Order_' })).toEqual({ status: 200, ids: [] });
  });

  it('returns everything for a blank search and 400 for a repeated one', async () => {
    expect((await ids({ q: '  ' })).ids).toEqual([3, 2, 1]);
    expect((await client.get('/orders?q=a&q=b')).status).toBe(400);
  });
});

describe('GET /orders/:id', () => {
  it('returns the order with its products', async () => {
    const res = await client.get('/orders/1');
    const order = res.body as OrderDetails;

    expect(res.status).toBe(200);
    expect(order.products.map((product) => product.title)).toEqual(['Monitor 1', 'Laptop 1']);
    expect(order.products[0]).toMatchObject({
      type: 'Monitors',
      order: 1,
      orderTitle: 'Order A',
      isNew: true,
      guarantee: { start: '2020-01-01T00:00:00.000Z', end: '2021-01-01T00:00:00.000Z' },
      price: [
        { value: 100, symbol: 'USD', isDefault: false },
        { value: 2600, symbol: 'UAH', isDefault: true },
      ],
    });
  });

  it('returns 404 for an unknown order', async () => {
    const res = await client.get('/orders/999');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Order not found' });
  });
});

describe('POST /orders', () => {
  it('creates an order', async () => {
    const res = await client.post('/orders').send({ title: 'New order', description: 'x' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'New order', description: 'x', productsCount: 0 });
    expect(await count(pool, 'orders')).toBe(4);
  });

  it('answers with the date exactly as it is stored: whole seconds, no rounding surprises', async () => {
    const created = await client
      .post('/orders')
      .send({ title: 'Precise', date: '2020-05-05T10:00:00.700Z' });
    const id = (created.body as OrderSummary).id;
    const stored = await client.get(`/orders/${id}`);

    expect((created.body as OrderSummary).date).toBe('2020-05-05T10:00:00.000Z');
    expect((stored.body as OrderDetails).date).toBe('2020-05-05T10:00:00.000Z');
  });

  it('reads the app.js date format (no zone) as UTC', async () => {
    const res = await client
      .post('/orders')
      .send({ title: 'Legacy format', date: '2017-06-29 12:09:33' });

    expect(res.status).toBe(201);
    expect((res.body as OrderSummary).date).toBe('2017-06-29T12:09:33.000Z');
  });

  it.each(['Order 1', '2020', '+010000-01-01T00:00:00Z'])(
    'rejects the date %j with 400, not 500',
    async (date) => {
      const res = await client.post('/orders').send({ title: 'x', date });

      expect(res.status).toBe(400);
      expect(await count(pool, 'orders')).toBe(3);
    },
  );

  it('rejects a description over the TEXT size with 400, not 500', async () => {
    const res = await client.post('/orders').send({ title: 'x', description: '😀'.repeat(20_000) });

    expect(res.status).toBe(400);
  });

  it('rejects an order without a title', async () => {
    const res = await client.post('/orders').send({ description: 'x' });

    expect(res.status).toBe(400);
    expect(await count(pool, 'orders')).toBe(3);
  });
});

describe('DELETE /orders/:id', () => {
  it('deletes the order together with its products and prices', async () => {
    const res = await client.delete('/orders/1');
    expect(res.status).toBe(204);

    expect((await client.get('/orders/1')).status).toBe(404);
    expect(await count(pool, 'products')).toBe(1);
    expect(await count(pool, 'product_prices')).toBe(2);
  });

  it('returns 404 for an unknown order', async () => {
    const res = await client.delete('/orders/999');

    expect(res.status).toBe(404);
    expect(await count(pool, 'orders')).toBe(3);
  });
});
