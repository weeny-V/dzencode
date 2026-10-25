# ADR 0005: Domain events on an in-process bus, delivered to open tabs over Socket.io

Status: implemented in stage 7b; verification is recorded in STAGE_7B_STATUS.md.

## Decision

- **A typed in-process bus** (`server/src/shared/events`). Events are facts in the past tense: `order.created`, `order.deleted`, `product.created`, `product.deleted` and the counter's `session.opened`, `session.closed`. `publish` is synchronous and delivers in registration order; a failing handler is reported and cannot break the publisher, whose write has already finished, or the other handlers. Handlers are registered by event type and return their own unsubscribe function.
- **Publishers are the owning services**, after the write succeeded: the orders and products services, and the sessions gateway when a fully authorized socket joins or leaves. A rejected or missing write publishes nothing. Deleting a product reads its order first, because the event has to say which order lost a product. Deleting an order publishes one `order.deleted`; its cascaded products are part of it.
- **Subscribers are gateways.** The inventory gateway forwards the four inventory events to the fully authorized tabs as `inventory:changed`; the sessions counter now reacts to `session.opened/closed` instead of being called by the gateway. Modules reach each other only through their `index.ts`; the bus is created once in the composition root and passed to both the HTTP and the socket side.
- **Events say what changed, not what it became.** No entity data travels, so the client keeps no copy and the existing server-first reads stay the single source of truth.
- **Cache expiry stays on the Next server.** A tab cannot expire a Data Cache tag itself, and the API server must not know Next. The tab therefore batches events for 250 ms and calls one Server Action that validates the batch (known shapes, at most 50, a session is required) and expires the same tag sets the mutating actions already expire, then refreshes the route. This also covers writes made straight against the API. The extra `order-details` umbrella tag lets a `resync` expire every cached order detail without knowing ids.
- **The tab that wrote hears its own event** and refreshes once more; the delay merges it with the mutation's own refresh. Carrying a client id through the Server Action and the REST call was judged not worth a new protocol field.
- **One socket per tab.** The inventory events ride the connection that already counts the tab; a second socket would be counted as a second tab. The sessions feature owns the socket and publishes validated changes into a tiny shared channel (`shared/lib/inventoryEvents`), which the `inventory-sync` feature subscribes to, so neither feature imports the other.
- **No replay.** The bus has no queue or store. After a reconnect the client sends itself a `resync`; events missed before a page's socket connects are covered only by the 60-second revalidation.

## Consequences

- Several server instances would each have their own bus and registry; sharing them needs a broker (Redis, a message queue), which is outside this stage.
- The notice for an order deleted in another tab is decided at flush time, so a tab that already left the panel does not show it.
- The server API and the client protocol are covered by tests at every layer: the bus, the services, REST-to-socket integration over real MySQL, the channel, the sync hook and the Server Action, plus a two-tab browser smoke.
