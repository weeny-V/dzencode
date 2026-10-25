import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestClient } from '../../shared/testing/auth.js';
import { count, createTestContext, resetData } from '../../shared/testing/database.js';
import {
  attemptWarehouseCoordinates,
  attemptWarehouseRemoval,
} from '../../shared/testing/inventory.repository.js';
import type { OrderDetails } from '../orders/index.js';
import type { Warehouse } from './warehouses.types.js';

const { app, pool, auth } = createTestContext();
const { client, register } = createTestClient(app, auth);
beforeEach(async () => {
  await resetData(pool);
  await register();
});
afterAll(async () => {
  await pool.end();
});
const warehouses = async () => {
  const response = await client.get('/warehouses');
  expect(response.status).toBe(200);
  return response.body as Warehouse[];
};

describe('warehouse reference and order association', () => {
  it('provides demonstrative, bounded metadata and no write endpoints', async () => {
    const list = await warehouses();
    expect(list).toHaveLength(2);
    for (const item of list) {
      expect(item.code).toMatch(/^DEMO-/);
      expect(Math.abs(item.latitude)).toBeLessThanOrEqual(90);
      expect(Math.abs(item.longitude)).toBeLessThanOrEqual(180);
    }
    expect((await client.post('/warehouses').send(list[0])).status).toBe(404);
    expect((await client.delete(`/warehouses/${list[0]!.id}`)).status).toBe(404);
  });
  it('keeps existing and legacy/new explicitly unassigned orders unassigned', async () => {
    expect((await client.get('/orders/1')).body).toMatchObject({
      warehouseId: null,
      warehouse: null,
    });
    for (const body of [{ title: 'Legacy' }, { title: 'Explicit', warehouseId: null }]) {
      const response = await client.post('/orders').send(body);
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ warehouseId: null });
    }
  });
  it('returns warehouse details and prevents removing a referenced warehouse', async () => {
    const warehouse = (await warehouses())[0]!;
    const created = await client
      .post('/orders')
      .send({ title: 'Assigned', warehouseId: warehouse.id });
    expect(created.status).toBe(201);
    const order = (await client.get(`/orders/${(created.body as { id: number }).id}`))
      .body as OrderDetails;
    expect(order.warehouse).toEqual(warehouse);
    expect(order.warehouseId).toBe(warehouse.id);
    await expect(attemptWarehouseRemoval(pool, warehouse.id)).rejects.toMatchObject({
      errno: 1451,
    });
  });
  it.each([0, -1, 0.5, '1', true, [], {}, 2147483648, 999999])(
    'rejects invalid/unknown warehouse %j atomically',
    async (warehouseId) => {
      const response = await client.post('/orders').send({ title: 'Rejected', warehouseId });
      expect(response.status).toBe(400);
      expect(await count(pool, 'orders')).toBe(3);
    },
  );
  it.each([
    [91, 0],
    [-91, 0],
    [0, 181],
    [0, -181],
  ])('enforces coordinates in MySQL: %s,%s', async (latitude, longitude) => {
    await expect(attemptWarehouseCoordinates(pool, latitude, longitude)).rejects.toMatchObject({
      errno: 3819,
    });
  });
});

it('rejects guest reads before protected warehouse/statistics access', async () => {
  expect((await request(app).get('/warehouses')).status).toBe(401);
  expect((await request(app).get('/statistics/inventory?currency=UAH')).status).toBe(401);
});
