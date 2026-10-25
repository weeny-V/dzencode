import type { DomainEvent, DomainEventType, EventOfType } from './events.js';

type Listener<T extends DomainEventType> = (event: EventOfType<T>) => void;

export interface EventBus {
  /** Delivers the event to its handlers one after another, in registration order, before returning. */
  publish: (event: DomainEvent) => void;
  /** Registers a handler for one event type; the returned function removes it. */
  on: <T extends DomainEventType>(type: T, listener: Listener<T>) => () => void;
}

/**
 * A typed, in-process bus. There is no queue and no persistence: an event reaches only the handlers registered
 * in this process at the moment of publishing. A failing handler is reported and never breaks the publisher
 * (which has already finished its work) or the other handlers.
 */
export const createEventBus = (
  onError: (error: unknown, event: DomainEvent) => void = (error) =>
    console.error('Event handler failed', error),
): EventBus => {
  const listeners = new Map<DomainEventType, Set<(event: never) => void>>();
  return {
    publish: (event) => {
      // A copy: a handler may unsubscribe itself while the event is being delivered.
      for (const listener of [...(listeners.get(event.type) ?? [])]) {
        try {
          (listener as (event: DomainEvent) => void)(event);
        } catch (error) {
          onError(error, event);
        }
      }
    },
    on: (type, listener) => {
      const registered = listeners.get(type) ?? new Set();
      registered.add(listener);
      listeners.set(type, registered);
      return () => {
        registered.delete(listener);
      };
    },
  };
};
