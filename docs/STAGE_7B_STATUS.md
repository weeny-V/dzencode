# Stage 7b implementation and owner review

Branch: `stage/7b-events`, from `main` at stage 7a (`6b5c5fa`). The plan and the owner review checklist are in [STAGE_7B_PLAN.md](STAGE_7B_PLAN.md); decisions are in [ADR 0005](adr/0005-inventory-events.md). The owner approved committing the stage and merging it into main after the verification below.

## Delivered behavior

- A typed in-process event bus on the server. The orders and products services publish `order.created/deleted` and `product.created/deleted` after a successful write only; the sessions gateway publishes `session.opened/closed` and the counter of open tabs now follows them.
- An inventory gateway forwards the four inventory events to the fully authorized tabs as `inventory:changed`. Guests and sockets that have not finished authorization receive nothing.
- Every protected tab batches the events it hears for 250 ms, calls one Server Action that expires the affected Data Cache tags, and refreshes the page. Writes made straight against the API are therefore visible without waiting for the 60-second revalidation.
- An order panel left open for an order deleted in another tab closes (other search parameters stay) with a short EN/RU notice; the tab that deleted it shows none.
- After a reconnect the tab re-reads the inventory (`resync`); events are not replayed.

## Verification

Run on 2026-10-26 (Node 22.23.3, headless Edge via an external Playwright installation) against the isolated `dzencode6d` Docker project. No schema change was needed.

| Check                                                                      | Result                   |
| -------------------------------------------------------------------------- | ------------------------ |
| `npm run lint`, `npm run format:check`, `npm run typecheck`                | pass                     |
| Server tests against the isolated database                                 | 28 files, 299 tests pass |
| Client tests                                                               | 67 files, 460 tests pass |
| `npm run build` (server and client)                                        | pass                     |
| `npm run audit:prod`                                                       | 0 vulnerabilities        |
| Docker build and start of `server` and `client`                            | both healthy             |
| `stage7b-events-smoke.cjs` (two tabs)                                      | pass                     |
| `stage6d-browser-smoke.cjs` (charts, graph, map, drafts, revoked sessions) | pass                     |
| `auth-browser-smoke.cjs`                                                   | pass                     |

The new server tests cover the bus, event publication from the services (including nothing on a failed or missing write), delivery over real sockets to authorized tabs only, the counter driven by bus events, and real REST writes against MySQL reaching a socket client (create, delete, cascade, rejected writes). The client tests cover the protocol parsers, tag mapping, the Server Action (session required, malformed input refused), the sync hook (debounce, ordering of expiry and refresh, auth-lifetime guard, unmount, the open-panel notice and its dismissal) and the channel (valid and invalid payloads, `resync` only after a reconnect).

The two-tab smoke drives a real stack: counter 2 with two tabs and a drop when one closes; an order and a product written through the API appear in another tab and in the Groups numbers without a reload; the open panel of a deleted order closes with the notice and keeps `q`; an order deleted from the list produces no notice; and a tab whose WebSocket was cut catches up after reconnecting.

## Findings during verification

- The smoke script waits for the page's socket before the write it expects to hear: an event published before the socket connects is not replayed. This is the documented limit, not a defect; a page rendered from a still-cached copy catches up at connect time or after the 60-second revalidation.
- With a panel open the narrow list hides its delete buttons, so a tab cannot delete the order whose panel it has open; the flush-time check still covers races.

## Not verified

- Several server instances (the bus and the registry are per process), a restart of the server while tabs are open (the reconnect path is exercised with a cut socket instead), other browser engines and a real mobile device.
- Load: a long burst of events from many writers was not measured; a batch is capped at 50 changes and merged per 250 ms per tab.
- No independent fresh-context review has been run on this stage.

Owner acceptance is not implied by automated checks.
