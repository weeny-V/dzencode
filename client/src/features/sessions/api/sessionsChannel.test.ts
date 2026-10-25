import { EventEmitter } from 'node:events';

import { io } from 'socket.io-client';
import { describe, expect, it, vi } from 'vitest';

import { openSessionsChannel, SESSIONS_COUNT_EVENT } from './sessionsChannel';

// A socket that is an event emitter with a spied `disconnect`, so the test can play the server's side.
vi.mock('socket.io-client', () => ({ io: vi.fn() }));

const setup = () => {
  const socket = Object.assign(new EventEmitter(), { disconnect: vi.fn() });
  vi.mocked(io).mockReturnValue(socket as unknown as ReturnType<typeof io>);
  const onCount = vi.fn();
  const onConnectionChange = vi.fn();
  const close = openSessionsChannel({ onCount, onConnectionChange });
  return { socket, onCount, onConnectionChange, close };
};

describe('inventory events on the same socket', () => {
  const withInventory = () => {
    const socket = Object.assign(new EventEmitter(), { disconnect: vi.fn() });
    vi.mocked(io).mockReturnValue(socket as unknown as ReturnType<typeof io>);
    const onInventoryChange = vi.fn();
    openSessionsChannel({ onCount: vi.fn(), onConnectionChange: vi.fn(), onInventoryChange });
    return { socket, onInventoryChange };
  };

  it('reports a valid inventory change', () => {
    const { socket, onInventoryChange } = withInventory();
    socket.emit('inventory:changed', { type: 'product.deleted', productId: 4, orderId: 2 });
    expect(onInventoryChange).toHaveBeenCalledWith({
      type: 'product.deleted',
      productId: 4,
      orderId: 2,
    });
  });

  it.each([
    null,
    'x',
    {},
    { type: 'order.deleted' },
    { type: 'order.created', orderId: -1 },
    { type: 'resync' },
  ])('ignores a payload that is not a server change: %j', (payload) => {
    const { socket, onInventoryChange } = withInventory();
    socket.emit('inventory:changed', payload);
    expect(onInventoryChange).not.toHaveBeenCalled();
  });

  it('asks for a resync only when the connection comes back, not on the first connect', () => {
    const { socket, onInventoryChange } = withInventory();
    socket.emit('connect');
    expect(onInventoryChange).not.toHaveBeenCalled();
    socket.emit('disconnect');
    socket.emit('connect');
    expect(onInventoryChange).toHaveBeenCalledOnce();
    expect(onInventoryChange).toHaveBeenCalledWith({ type: 'resync' });
  });
});

describe('openSessionsChannel', () => {
  it('opens its own connection to the API server', () => {
    setup();

    expect(io).toHaveBeenCalledWith('http://localhost:4000', {
      forceNew: true,
      withCredentials: true,
      transports: ['websocket'],
    });
  });

  it('reports the count the server sends', () => {
    const { socket, onCount } = setup();

    socket.emit(SESSIONS_COUNT_EVENT, { count: 3 });

    expect(onCount).toHaveBeenCalledWith(3);
  });

  it.each([null, 'many', {}, { count: '3' }, { count: null }])(
    'ignores a payload that is not a count: %j',
    (payload) => {
      const { socket, onCount } = setup();

      socket.emit(SESSIONS_COUNT_EVENT, payload);

      expect(onCount).not.toHaveBeenCalled();
    },
  );

  it('reports the connection coming up, going away and failing', () => {
    const { socket, onConnectionChange } = setup();

    socket.emit('connect');
    socket.emit('disconnect');
    socket.emit('connect_error', new Error('refused'));

    expect(onConnectionChange.mock.calls).toEqual([[true], [false], [false]]);
  });

  it('closes the connection and stops reporting after the cleanup', () => {
    const { socket, onCount, onConnectionChange, close } = setup();

    close();
    // The library fires `disconnect` while closing, and late events may still arrive.
    socket.emit('disconnect');
    socket.emit(SESSIONS_COUNT_EVENT, { count: 9 });

    expect(socket.disconnect).toHaveBeenCalledOnce();
    expect(onCount).not.toHaveBeenCalled();
    expect(onConnectionChange).not.toHaveBeenCalled();
  });
});
