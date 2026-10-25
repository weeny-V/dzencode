# Stage 7a implementation and owner review

Branch: `stage/7a-graphql-graph`, from `main` at stage 6d (`0df3eac`). The plan and the owner review checklist are in [STAGE_7A_PLAN.md](STAGE_7A_PLAN.md); decisions are in [ADR 0004](adr/0004-graphql-and-relations-graph.md). The owner approved committing the stage and merging it into main after the verification below.

## Delivered behavior

- A read-only GraphQL endpoint (`/graphql`, graphql-yoga) behind the same bearer authentication as the REST inventory APIs. `inventoryStatistics(currency)` keeps the 6d contract; `inventoryGraph(limit)` returns the warehouse - order - product-type relations for the orders with the most products, read in the same REPEATABLE READ snapshot. No mutations, GraphiQL or extra CORS; unexpected errors are masked; validation errors are `BAD_USER_INPUT`.
- The REST `GET /statistics/inventory` is removed (404). CRUD, authentication, sessions, warehouses and sockets are unchanged.
- Groups reads both queries through the Next server (GET, session check before warmed cache hits, session-isolated keys, `statistics` tag), shows the new graph section with zoom/fit buttons, an exact table of connections, and a local error with retry when only the graph fails.
- Cytoscape.js loads only when the graph section becomes visible, through the shared `useDeferredRuntime` hook that Chart.js now also uses.

## Verification

Run on 2026-10-25 (Node 22.23.3, headless Edge via an external Playwright installation) against the isolated `dzencode6d` Docker project. No schema change was needed, so the 6d database was reused.

| Check                                                            | Result                            |
| ---------------------------------------------------------------- | --------------------------------- |
| `npm run lint`, `npm run format:check`                           | pass                              |
| Client `tsc --noEmit` (errors in `src`)                          | 0 (see the note on `.next` below) |
| Server tests against the isolated database                       | 26 files, 282 tests pass          |
| Client tests                                                     | 63 files, 401 tests pass          |
| `npm run build` (server and client)                              | pass                              |
| `npm run audit:prod`                                             | 0 vulnerabilities                 |
| Docker build and start of `server` and `client`                  | both healthy                      |
| `stage6d-browser-smoke.cjs` (extended for GraphQL and the graph) | pass                              |
| `auth-browser-smoke.cjs` on the same stack                       | pass                              |

Measured deferred assets (production build): Chart.js 146,060 B (51,659 B gzip), Leaflet 149,788 B (43,349 B gzip) plus CSS 10,572 B, **Cytoscape 432,101 B (135,589 B gzip)**. The smoke asserts that none of them is requested before its section is visible or on other pages. Cytoscape is the heaviest of the three; it is loaded only on Groups and only when the graph scrolls into view.

The smoke found and the code now prevents two rendering defects: `width: 'label'` (deprecated in Cytoscape 3.34) left most nodes undrawn, and a container resize (a narrow-to-wide viewport change) left a stale canvas. Node width now comes from the label text and a `ResizeObserver` refits the graph. The graph container exposes `data-nodes` and `data-visible-nodes`, and the smoke asserts they are equal and that the canvas width follows the container.

Note on `tsc` in this checkout: `client/.next/dev/types` held generated files of an older dev session and made `tsc` and `next build` fail on routes that no longer exist. It is ignored by git and predates this stage. I moved it aside for the build; `next build` then cleaned the `.next` folder, so it is gone, and `next dev` regenerates it. `npm run typecheck` passes now.

## Not verified

- A graph with the maximum of 100 orders was not exercised in a browser; with 40 orders (the default) the layout is tall, and readability relies on the pan and zoom buttons and on the table.
- Keyboard-only use covers the zoom/fit buttons; the canvas itself has no keyboard selection (the table is the accessible form).
- Other browser engines and a real mobile device.
- No independent fresh-context review has been run on this stage.

Owner acceptance is not implied by automated checks.
