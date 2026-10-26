// End to end on the server side: a real REST write against MySQL reaches a real Socket.io client as an event.
import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { io as connect, type Socket } from 'socket.io-client';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadConfig } from '../../config.js';
import { attachRealtime } from '../../realtime.js';
import type { InventoryEvent } from '../../shared/events/events.js';
import { createTestClient, TEST_REGISTRATION } from '../../shared/testing/auth.js';
import { createTestContext, resetData } from '../../shared/testing/database.js';
import type { OrderDetails } from '../orders/index.js';
import { INVENTORY_CHANGED_EVENT } from './index.js';

const { clientOrigin } = loadConfig();
const { app, pool, auth, events } = createTestContext();
const { client, register } = createTestClient(app, auth);
let httpServer: HttpServer;
let socket: Socket;
let received: unknown[];

beforeEach(async () => {
  await resetData(pool);
  await register();
  httpServer = createServer(app);
  attachRealtime(httpServer, { clientOrigin, auth, events });
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const { token } = await auth.login({
    email: TEST_REGISTRATION.email,
    password: TEST_REGISTRATION.password,
  });
  received = [];
  socket = connect(`http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
    extraHeaders: { Origin: clientOrigin, Cookie: `dzencode_auth=${token}` },
  });
  socket.on(INVENTORY_CHANGED_EVENT, (event: unknown) => received.push(event));
  await new Promise<void>((resolve) => socket.once('sessions:count', () => resolve()));
});
afterEach(async () => {
  socket.disconnect();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});
afterAll(async () => {
  await pool.end();
});

const settle = () => new Promise((resolve) => setTimeout(resolve, 150));

describe('inventory events from real REST writes', () => {
  it('makes complete product prices and GraphQL aggregates readable when a write is announced', async () => {
    const readStatistics = async () => {
      const response = await client.get('/graphql').query({
        query: '{ inventoryStatistics(currency: UAH) { productsCount value } }',
      });
      expect(response.status).toBe(200);
      return (
        response.body as {
          data: { inventoryStatistics: { productsCount: number; value: number } };
        }
      ).data.inventoryStatistics;
    };
    const before = await readStatistics();
    // Subscribe before sending: Socket.io can deliver before the HTTP response arrives.
    const announced = new Promise<InventoryEvent>((resolve) =>
      socket.once(INVENTORY_CHANGED_EVENT, resolve),
    );
    const response = await client.post('/products').send({
      title: 'Committed product',
      serialNumber: 909,
      isNew: true,
      type: 'Monitors',
      order: 1,
      guarantee: { start: '2026-01-01', end: '2027-01-01' },
      price: [
        { value: 50, symbol: 'UAH', isDefault: true },
        { value: 2, symbol: 'USD', isDefault: false },
      ],
    });
    expect(response.status).toBe(201);
    const id = (response.body as { id: number }).id;
    expect(await announced).toEqual({ type: 'product.created', productId: id, orderId: 1 });
    const details = (await client.get('/orders/1')).body as OrderDetails;
    expect(details.products.find((product) => product.id === id)?.price).toEqual(
      expect.arrayContaining([
        { value: 50, symbol: 'UAH', isDefault: true },
        { value: 2, symbol: 'USD', isDefault: false },
      ]),
    );
    expect(await readStatistics()).toEqual({
      productsCount: before.productsCount + 1,
      value: before.value + 50,
    });
    const deleted = new Promise<InventoryEvent>((resolve) =>
      socket.once(INVENTORY_CHANGED_EVENT, resolve),
    );
    expect((await client.delete(`/products/${id}`)).status).toBe(204);
    expect(await deleted).toEqual({ type: 'product.deleted', productId: id, orderId: 1 });
    expect(await readStatistics()).toEqual(before);
  });

  it('announces a created order, a created product and their deletion in order', async () => {
    const order = await client.post('/orders').send({ title: 'Live order' });
    const orderId = (order.body as { id: number }).id;
    const product = await client.post('/products').send({
      title: 'Live product',
      serialNumber: 777,
      isNew: true,
      type: 'Monitors',
      guarantee: { start: '2026-01-01', end: '2027-01-01' },
      price: [{ value: 10, symbol: 'UAH', isDefault: true }],
      order: orderId,
    });
    const productId = (product.body as { id: number }).id;
    expect((await client.delete(`/products/${productId}`)).status).toBe(204);
    expect((await client.delete(`/orders/${orderId}`)).status).toBe(204);
    await settle();
    expect(received).toEqual([
      { type: 'order.created', orderId },
      { type: 'product.created', productId, orderId },
      { type: 'product.deleted', productId, orderId },
      { type: 'order.deleted', orderId },
    ]);
  });
  it('announces nothing for rejected or missing writes', async () => {
    expect((await client.post('/orders').send({})).status).toBe(400);
    expect((await client.delete('/orders/9999')).status).toBe(404);
    expect((await client.delete('/products/9999')).status).toBe(404);
    expect(
      (await client.post('/products').send({ title: 'x', order: 9999 })).status,
    ).toBeGreaterThanOrEqual(400);
    await settle();
    expect(received).toEqual([]);
  });
  it('announces one order deletion for a cascade that removes its products', async () => {
    expect((await client.delete('/orders/1')).status).toBe(204);
    await settle();
    expect(received).toEqual([{ type: 'order.deleted', orderId: 1 }]);
  });
});
