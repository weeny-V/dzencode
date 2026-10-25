import { describe, expect, it, vi } from 'vitest';

import { createEventBus } from './eventBus.js';

describe('event bus', () => {
  it('delivers an event only to the handlers of its type, in registration order', () => {
    const bus = createEventBus();
    const calls: string[] = [];
    bus.on('order.created', (event) => calls.push(`first ${event.orderId}`));
    bus.on('order.created', (event) => calls.push(`second ${event.orderId}`));
    bus.on('order.deleted', () => calls.push('deleted'));
    bus.publish({ type: 'order.created', orderId: 7 });
    expect(calls).toEqual(['first 7', 'second 7']);
  });
  it('stops delivering after unsubscribing, also from inside a handler', () => {
    const bus = createEventBus();
    const once = vi.fn();
    const stop = bus.on('product.created', (event) => {
      once(event);
      stop();
    });
    const always = vi.fn();
    bus.on('product.created', always);
    bus.publish({ type: 'product.created', productId: 1, orderId: 2 });
    bus.publish({ type: 'product.created', productId: 3, orderId: 2 });
    expect(once).toHaveBeenCalledOnce();
    expect(always).toHaveBeenCalledTimes(2);
  });
  it('reports a failing handler without breaking the publisher or the other handlers', () => {
    const onError = vi.fn();
    const bus = createEventBus(onError);
    const after = vi.fn();
    bus.on('session.opened', () => {
      throw new Error('boom');
    });
    bus.on('session.opened', after);
    expect(() => bus.publish({ type: 'session.opened', sessionId: 'a' })).not.toThrow();
    expect(after).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(expect.any(Error), {
      type: 'session.opened',
      sessionId: 'a',
    });
  });
  it('does nothing for an event nobody listens to', () => {
    expect(() => createEventBus().publish({ type: 'order.deleted', orderId: 1 })).not.toThrow();
  });
});
