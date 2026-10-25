import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { withReadSnapshot } from '../../shared/db/readSnapshot.repository.js';
import { createTestClient } from '../../shared/testing/auth.js';
import { createTestContext, resetData } from '../../shared/testing/database.js';
import {
  assignWarehouse,
  emptyInventory,
  removeSelectedPrice,
  zeroSelectedPrice,
} from '../../shared/testing/inventory.repository.js';
import { createOrdersInventoryReader } from '../orders/index.js';
import { createProductsInventoryReader } from '../products/index.js';
import type { Warehouse } from '../warehouses/index.js';
import type { InventoryStatistics } from './statistics.types.js';

const { app, pool, auth } = createTestContext();
const { client, register } = createTestClient(app, auth);
beforeEach(async () => {
  await resetData(pool);
  await register();
});
afterAll(async () => {
  await pool.end();
});
const read = async (currency?: string) => {
  const response = await client.get('/statistics/inventory').query(currency ? { currency } : {});
  expect(response.status).toBe(200);
  return response.body as InventoryStatistics;
};

describe('inventory statistics over real MySQL', () => {
  it('denies a revoked bearer after previously reading both new endpoints', async () => {
    expect((await client.get('/warehouses')).status).toBe(200);
    expect((await client.get('/statistics/inventory?currency=USD')).status).toBe(200);
    expect((await client.post('/auth/logout')).status).toBe(204);
    expect((await client.get('/warehouses')).status).toBe(401);
    expect((await client.get('/statistics/inventory?currency=USD')).status).toBe(401);
  });
  it('keeps one snapshot when another connection deletes inventory between aggregate reads', async () => {
    await withReadSnapshot(pool, async (database) => {
      const locations = await createOrdersInventoryReader(database).inventoryLocations();
      expect(locations).toHaveLength(3);
      expect((await client.delete('/orders/1')).status).toBe(204);
      const groups = await createProductsInventoryReader(database).inventoryGroups('UAH');
      expect(groups.reduce((total, group) => total + group.productsCount, 0)).toBe(3);
    });
    expect(await read()).toMatchObject({ ordersCount: 2, productsCount: 1 });
  });
  it('counts products once, includes empty orders/warehouses, and never mixes currencies', async () => {
    const warehouses = (await client.get('/warehouses')).body as Warehouse[];
    const warehouse = warehouses[0]!;
    await assignWarehouse(pool, 1, warehouse.id);
    const uah = await read();
    expect(uah).toMatchObject({
      currency: 'UAH',
      ordersCount: 3,
      productsCount: 3,
      value: 29900,
      missingPrices: 0,
    });
    expect(uah.byType).toEqual([
      { type: 'Laptops', productsCount: 1 },
      { type: 'Monitors', productsCount: 2 },
    ]);
    expect(uah.byWarehouse.find((row) => row.warehouseId === warehouse.id)).toMatchObject({
      productsCount: 2,
      value: 28600,
    });
    expect(uah.byWarehouse.find((row) => row.warehouseId === null)).toMatchObject({
      productsCount: 1,
      value: 1300,
    });
    expect(uah.byWarehouse.find((row) => row.warehouseId === warehouses[1]!.id)).toMatchObject({
      productsCount: 0,
      value: 0,
    });
    expect(await read('USD')).toMatchObject({
      currency: 'USD',
      productsCount: 3,
      value: 1150,
      missingPrices: 0,
    });
  });
  it('distinguishes missing prices from real zero values per currency and per warehouse', async () => {
    await removeSelectedPrice(pool, 2, 'USD');
    await zeroSelectedPrice(pool, 1, 'USD');
    const usd = await read('USD');
    expect(usd).toMatchObject({ productsCount: 3, value: 50, missingPrices: 1 });
    expect(usd.byWarehouse.find((row) => row.warehouseId === null)).toMatchObject({
      value: 50,
      missingPrices: 1,
    });
    expect(await read('UAH')).toMatchObject({ value: 29900, missingPrices: 0 });
  });
  it('returns valid zeros for entirely empty inventory', async () => {
    await emptyInventory(pool);
    const result = await read();
    expect(result).toMatchObject({ ordersCount: 0, productsCount: 0, value: 0, missingPrices: 0 });
    expect(result.byWarehouse.every((row) => row.value === 0 && row.productsCount === 0)).toBe(
      true,
    );
    expect(result.byType.every((row) => row.productsCount === 0)).toBe(true);
  });
  it.each(['currency=EUR', 'currency=usd', 'currency=', 'currency=USD&currency=UAH'])(
    'rejects invalid query %s',
    async (query) => {
      expect((await client.get(`/statistics/inventory?${query}`)).status).toBe(400);
    },
  );
  it('reads current inventory after creates and cascading deletes', async () => {
    const created = await client.post('/orders').send({ title: 'Empty new order' });
    expect(await read()).toMatchObject({ ordersCount: 4, productsCount: 3 });
    await client.delete(`/orders/${(created.body as { id: number }).id}`);
    await client.delete('/orders/1');
    expect(await read()).toMatchObject({ ordersCount: 2, productsCount: 1, value: 1300 });
  });
});

it('rejects guest reads before protected warehouse/statistics access', async () => {
  expect((await request(app).get('/warehouses')).status).toBe(401);
  expect((await request(app).get('/statistics/inventory?currency=UAH')).status).toBe(401);
});
