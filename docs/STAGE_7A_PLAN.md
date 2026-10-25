# Stage 7a: GraphQL and the relations graph

Branch: `stage/7a-graphql-graph`, from `main` after stage 6d (`0df3eac`). Stage 7 is split into four branches, each from `main` after the previous one is reviewed: **7a** GraphQL and the graph, **7b** event-driven inventory updates, **7c** Web Workers, PWA and front-end optimization, **7d** npm task scripts, integration and end-to-end tests.

## Agreed choices

| Decision    | Selected behavior                                                                                                                             |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope split | REST stays for CRUD, authentication, sessions and the warehouse list (the base task requires REST); GraphQL is read-only and analytical.      |
| Library     | graphql-yoga on the existing Express app. No Apollo.                                                                                          |
| Old REST    | `GET /statistics/inventory` is removed; its consumers (Groups, tests, smoke script, docs) move to GraphQL. `statistics.service` is unchanged. |
| Graph       | Warehouse - order - product-type relations from GraphQL, drawn with Cytoscape.js, loaded lazily.                                              |

## Server

- A `graphql` module: SDL, resolvers over `StatisticsService`, a yoga handler mounted behind `requireAuthentication`. No mutations, GraphiQL, landing page or extra CORS.
- `inventoryStatistics(currency: Currency = UAH)` keeps the 6d contract. `inventoryGraph(limit: Int = 40)` returns nodes, edges, `ordersTotal` and `ordersShown`; `limit` is 1-100. The graph reads through the same REPEATABLE READ snapshot.
- Domain validation errors become `BAD_USER_INPUT` (HTTP 400); unexpected resolver errors are masked.
- Order titles join the orders inventory reader (`id, title, warehouseId`).

## Client

- `queryGraphql` sends read-only queries with GET through `getJson`: session check before warmed hits, session-isolated keys, `statistics` tag, TTL.
- Groups loads the statistics and the graph in parallel; a graph failure leaves the report intact with a local retry.
- A shared `useDeferredRuntime` hook (visibility, deadline, retry, late-result and session guards) now serves both Chart.js and Cytoscape.
- The graph section has zoom/fit buttons, no wheel capture, neighbourhood highlight, and an exact table of connections.
- EN/RU messages are colocated with Groups; labels of the unassigned warehouse come from the existing dictionary.

## Owner review checklist

### GraphQL

- [ ] `GET /graphql` answers 401 for guests and revoked sessions; there is no mutation type; the REST statistics endpoint returns 404.
- [ ] Invalid currency or a graph limit outside 1-100 is rejected (`BAD_USER_INPUT` for the limit); unexpected errors are masked.
- [ ] Statistics values equal the 6d results on the same data (counts, UAH/USD sums, missing prices, unassigned bucket).
- [ ] CRUD, authentication, sessions and sockets are unchanged.

### Graph

- [ ] The graph shows each warehouse, the busiest orders and their product types with correct links and counts; an order without a warehouse links to "Unassigned".
- [ ] The Cytoscape chunk is requested only when the graph section becomes visible, and not on other pages.
- [ ] A chunk failure shows a recoverable message; the table of connections remains.
- [ ] Zoom in/out/fit work by keyboard; the page still scrolls over the canvas; labels follow EN/RU.
- [ ] More orders than the limit shows how many are displayed.

### Handover

- [ ] Root lint, typecheck, test, format:check, build and production audit pass.
- [ ] The isolated Docker stack and the browser smoke pass; started processes are stopped.
- [ ] No commit or merge into `main` without the owner's OK.

## References

- [ADR 0004](adr/0004-graphql-and-relations-graph.md)
- [API.md](API.md#graphql-stage-7a)
