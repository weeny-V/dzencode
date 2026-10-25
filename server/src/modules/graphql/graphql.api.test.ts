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
import type { InventoryGraph, InventoryStatistics } from '../statistics/index.js';
import type { Warehouse } from '../warehouses/index.js';

const { app, pool, auth } = createTestContext();
const { client, register } = createTestClient(app, auth);
beforeEach(async () => {
  await resetData(pool);
  await register();
});
afterAll(async () => {
  await pool.end();
});

const STATISTICS = `query ($currency: Currency) {
  inventoryStatistics(currency: $currency) {
    currency ordersCount productsCount value missingPrices
    byType { type productsCount }
    byWarehouse { warehouseId name productsCount value missingPrices }
  }
}`;
const GRAPH = `query ($limit: Int) {
  inventoryGraph(limit: $limit) {
    ordersTotal ordersShown
    nodes { id kind label productsCount }
    edges { id source target productsCount }
  }
}`;
interface GraphQLBody<T> {
  data?: T | null;
  errors?: { message: string; extensions?: { code?: string } }[];
}
const run = async <T>(query: string, variables: Record<string, unknown> = {}) => {
  const response = await client
    .get('/graphql')
    .query({ query, variables: JSON.stringify(variables) });
  return { status: response.status, body: response.body as GraphQLBody<T> };
};
const read = async (currency?: string) => {
  const response = await run<{ inventoryStatistics: InventoryStatistics }>(
    STATISTICS,
    currency ? { currency } : {},
  );
  expect(response.body.errors).toBeUndefined();
  return response.body.data!.inventoryStatistics;
};
const graph = async (limit?: number) => {
  const response = await run<{ inventoryGraph: InventoryGraph }>(
    GRAPH,
    limit === undefined ? {} : { limit },
  );
  expect(response.body.errors).toBeUndefined();
  return response.body.data!.inventoryGraph;
};

describe('inventory statistics over GraphQL and real MySQL', () => {
  it('denies guests and revoked bearers on the GraphQL endpoint', async () => {
    expect((await run(STATISTICS, { currency: 'USD' })).status).toBe(200);
    expect((await request(app).get('/graphql').query({ query: STATISTICS })).status).toBe(401);
    expect((await client.post('/auth/logout')).status).toBe(204);
    expect((await run(STATISTICS, { currency: 'USD' })).status).toBe(401);
  });
  it('no longer serves the REST statistics endpoint', async () => {
    expect((await client.get('/statistics/inventory?currency=UAH')).status).toBe(404);
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
  it.each(['EUR', 'usd', '', null])('rejects invalid currency %j', async (currency) => {
    const response = await run(STATISTICS, { currency });
    expect(response.body.errors).toBeDefined();
    expect(response.body.data ?? null).toBeNull();
  });
  it('reads current inventory after creates and cascading deletes', async () => {
    const created = await client.post('/orders').send({ title: 'Empty new order' });
    expect(await read()).toMatchObject({ ordersCount: 4, productsCount: 3 });
    await client.delete(`/orders/${(created.body as { id: number }).id}`);
    await client.delete('/orders/1');
    expect(await read()).toMatchObject({ ordersCount: 2, productsCount: 1, value: 1300 });
  });
});

describe('inventory graph over GraphQL', () => {
  it('links warehouses, orders and product types with product counts', async () => {
    const warehouse = ((await client.get('/warehouses')).body as Warehouse[])[0]!;
    await assignWarehouse(pool, 1, warehouse.id);
    const result = await graph();
    expect(result).toMatchObject({ ordersTotal: 3, ordersShown: 3 });
    const node = (id: string) => result.nodes.find((candidate) => candidate.id === id);
    expect(node(`warehouse:${warehouse.id}`)).toMatchObject({
      kind: 'WAREHOUSE',
      label: warehouse.name,
      productsCount: 2,
    });
    expect(node('warehouse:none')).toMatchObject({
      kind: 'WAREHOUSE',
      label: null,
      productsCount: 1,
    });
    expect(node('order:1')).toMatchObject({ kind: 'ORDER', label: 'Order A', productsCount: 2 });
    expect(node('order:3')).toMatchObject({
      kind: 'ORDER',
      label: 'Empty order',
      productsCount: 0,
    });
    expect(node('type:Monitors')).toMatchObject({ kind: 'PRODUCT_TYPE', productsCount: 2 });
    expect(node('type:Laptops')).toMatchObject({ kind: 'PRODUCT_TYPE', productsCount: 1 });
    const edge = (id: string) => result.edges.find((candidate) => candidate.id === id);
    expect(edge(`warehouse:${warehouse.id}>order:1`)).toMatchObject({ productsCount: 2 });
    expect(edge('order:1>type:Monitors')).toMatchObject({ productsCount: 1 });
    expect(edge('order:1>type:Laptops')).toMatchObject({ productsCount: 1 });
    expect(edge('warehouse:none>order:2')).toMatchObject({ productsCount: 1 });
    expect(edge('order:3>type:Monitors')).toBeUndefined();
    const nodeIds = new Set(result.nodes.map((candidate) => candidate.id));
    expect(result.edges.every((e) => nodeIds.has(e.source) && nodeIds.has(e.target))).toBe(true);
  });
  it('keeps every reference warehouse even without orders', async () => {
    await emptyInventory(pool);
    const result = await graph();
    expect(result).toMatchObject({ ordersTotal: 0, ordersShown: 0, edges: [] });
    expect(result.nodes.every((candidate) => candidate.kind === 'WAREHOUSE')).toBe(true);
    expect(result.nodes.length).toBeGreaterThan(0);
  });
  it('limits the graph to the orders with the most products', async () => {
    const result = await graph(1);
    expect(result).toMatchObject({ ordersTotal: 3, ordersShown: 1 });
    expect(result.nodes.filter((candidate) => candidate.kind === 'ORDER')).toEqual([
      { id: 'order:1', kind: 'ORDER', label: 'Order A', productsCount: 2 },
    ]);
  });
  it.each([0, -1, 101])('rejects limit %i with a user-input error', async (limit) => {
    const response = await run(GRAPH, { limit });
    expect(response.body.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT');
  });
});

describe('GraphQL endpoint hardening', () => {
  it('exposes no mutations and refuses state changes over GET', async () => {
    const response = await run('mutation { deleteEverything }');
    expect(response.body.errors).toBeDefined();
    expect(response.body.data ?? null).toBeNull();
  });
  it('does not widen CORS beyond the application policy', async () => {
    const response = await client
      .get('/graphql')
      .set('Origin', 'http://evil.example')
      .query({ query: '{ __typename }' });
    expect(response.headers['access-control-allow-origin']).not.toBe('http://evil.example');
  });
  it('masks unexpected errors', async () => {
    const response = await run('{ nonexistentField }');
    expect(response.body.errors).toBeDefined();
    expect(JSON.stringify(response.body)).not.toMatch(/stack|mysql/i);
  });
});
