# Stage 7b: event-driven inventory updates

Branch: `stage/7b-events`, from `main` after stage 7a (`6b5c5fa`). Part of stage 7 (see [PLAN.md](PLAN.md)).

## Agreed choices

| Decision      | Selected behavior                                                                                                                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transport     | A typed in-process event bus delivered through the existing Socket.io. No Redis or other broker.                                                                                                      |
| Cache         | The tab that hears an event calls one Server Action that expires the affected tags, then refreshes (covers direct API writes too).                                                                    |
| User feedback | Silent updates; if the open order panel's order was deleted elsewhere, the panel closes with a short notice. Forms and drafts are untouched.                                                          |
| Own events    | Not ignored; bursts are merged by a 250 ms delay.                                                                                                                                                     |
| Event set     | `order.created/deleted`, `product.created/deleted`, and `session.opened/closed` for the counter (the counter of open tabs moves onto the bus). Login/logout of accounts are not events in this stage. |

## Server

- `shared/events`: `EventBus` (`publish`, `on`), event types, failure isolation.
- Orders and products services publish after a successful write; the products service reads the order of a product before deleting it.
- `modules/inventory-events`: forwards inventory events to the authorized-tabs room as `inventory:changed`.
- The sessions gateway publishes `session.opened/closed`; the counter subscribes. `createApp` creates (or receives) the bus and returns it; `attachRealtime` receives the same one.

## Client

- `shared/lib/inventoryEvents`: protocol types, strict parsers, a small publish/subscribe channel.
- The sessions channel (the tab's only socket) forwards valid `inventory:changed` payloads and a `resync` after a reconnect.
- `features/inventory-sync`: Server Action `expireInventory`, tag mapping, the sync hook, the notice, EN/RU messages; mounted once in the app shell.
- Shared `tags` registry; order details also carry the `order-details` umbrella tag.

## Owner review checklist

- [ ] An order or product created or deleted in one tab (or straight through the API) appears in another open tab within about a second, without a reload; Groups numbers follow too.
- [ ] The counter of open tabs still counts correctly when tabs open and close.
- [ ] An order panel left open in tab B closes with a notice when tab A deletes that order; other search parameters stay; no notice appears in the tab that deleted it.
- [ ] After a dropped connection, the tab catches up when it reconnects.
- [ ] Guests receive nothing; rejected writes produce no events; the Server Action refuses malformed input and guests.
- [ ] REST CRUD, GraphQL, authentication and the counter behave as before.
- [ ] Root lint, typecheck, test, format:check, build and the production audit pass; the isolated Docker stack and the browser smokes pass; started processes are stopped.
- [ ] No commit or merge into `main` without the owner's OK.

## References

- [ADR 0005](adr/0005-inventory-events.md)
- [API.md](API.md#inventory-events-stage-7b)
