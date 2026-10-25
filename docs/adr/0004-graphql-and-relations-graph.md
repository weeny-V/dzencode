# ADR 0004: A read-only GraphQL API for analytical reads and a relations graph

Status: implemented in stage 7a; verification is recorded in STAGE_7A_STATUS.md.

## Decision

- **Split by purpose, not by taste.** REST keeps CRUD, authentication, sessions and the warehouse reference list. The base task requires REST, and the Server Actions, session handling, cache tags and tests of stages 3-6 already rest on it. GraphQL serves only analytical reads whose response shape is the point: `inventoryStatistics` and `inventoryGraph`. GraphQL mutations would duplicate working REST endpoints without a benefit for the simple forms.
- **The REST statistics endpoint was removed.** Its only consumers were the Groups page, its tests and the smoke script, all moved to GraphQL. Keeping two public contracts for one aggregate would double the maintenance and the authorization surface. `statistics.service` is unchanged: only the transport differs.
- **graphql-yoga on the existing Express app**, mounted after `requireAuthentication` and before the JSON parser (yoga reads its own body). The handler turns CORS, GraphiQL and the landing page off, so the application-level CORS policy stays the only one. Resolvers call the statistics service; the single translation of a domain `ValidationError` into a `BAD_USER_INPUT` GraphQL error lives next to the resolvers, mirroring `shared/http/errorHandler.ts` for REST. Error masking checks structure instead of `instanceof`, because yoga and this package can load different copies of `graphql`.
- **Queries travel over GET from the Next server.** The query text and variables are part of the request path, so `getJson` keeps its guarantees: the session is verified before any warmed cache lookup, keys are isolated by user/session and carry no credentials, and the `statistics` tag is expired by the same successful mutations as before. Only operations that read are sent this way, and the server exposes no mutations.
- **The graph is bounded on the server.** `inventoryGraph(limit)` returns the orders with the most products (default 40, maximum 100) with their warehouse and product-type edges, plus `ordersTotal`/`ordersShown`. It is read in the same REPEATABLE READ snapshot as the statistics, through public module services. The unassigned warehouse has a null label; the client localizes it.
- **Cytoscape.js is loaded lazily**, only when the graph section becomes visible, by the same deferred-runtime hook as Chart.js (`useDeferredRuntime`: IntersectionObserver, 12-second deadline, late-result and auth-lifetime guards, retry, cleanup). Nodes sit in three fixed columns (preset layout). Wheel zoom is off so the page keeps scrolling; zoom in/out/fit are buttons and the background pans. Selecting a node highlights its neighbourhood.
- **The canvas is never the only source.** Groups also renders a table of the same connections (order, warehouse, products, product types), so the data remains available when the library fails to load, to assistive technology and on small screens.

## Consequences

- External consumers of the removed REST statistics endpoint would break; there are none in this repository.
- Introspection stays available to authenticated users; the schema contains nothing beyond what the REST API already exposed.
- Inventory events (stage 7b) will refresh the same `statistics` tag; the GraphQL layer needs no change for that.
