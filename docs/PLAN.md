# Stage plan

Every stage lives in its own `stage/N-name` branch cut from `main`. The details of a stage are discussed before it starts; the branch is merged into `main` (`--no-ff`) only after an explicit OK.

| #   | Branch                    | Content                                                                                                                             |
| --- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 0   | `stage/0-scaffold`        | Monorepo `client/` + `server/`, Next.js 16 + TypeScript, Express + TypeScript, ESLint + Prettier, Docker, README, task materials    |
| 1   | `stage/1-database`        | MySQL in Docker, Liquibase (migrations + seed from `app.js`), `.mwb` for Workbench, REST API, integration tests                     |
| 1b  | `stage/1b-docs-site`      | VitePress documentation: `docs/` as a separate workspace, `docs:dev` / `docs:build` scripts, sidebar, DB schema and API description |
| 2   | `stage/2-layout`          | Bootstrap + SCSS in BEM, layout from the screenshots, NavigationMenu, TopMenu with a clock, routing, transition animations          |
| 3   | `stage/3-orders-products` | Redux, Fetch to the real API, Orders and Products pages, filter by type                                                             |
| 4   | `stage/4-realtime`        | Socket.io, counter of active sessions                                                                                               |
| 5   | `stage/5-forms`           | Delete popup, forms to add an order and a product with validation                                                                   |
| 6   | `stage/6-junior-plus`     | SSR data prefetch, i18n, JWT, Web Storage, Lazy Loading, Charts, Maps, unit and component tests                                     |
| 7   | `stage/7-middle`          | GraphQL, Web Workers, PWA, EDA, optimization, npm scripts, integration and e2e tests, Graph                                         |
| 8   | `stage/8-deploy`          | Deployment, a from-scratch self-check by the README, a checklist for the tester                                                     |

During stage 0 a set of ESLint rules was agreed (promises with type-aware checks on the client and the server, import order and type imports through `simple-import-sort`, client layer boundaries, safety rules). Details are in [CODING_RULES.md](CODING_RULES.md#eslint-rules). New rules are added there and to the configs as the stages go on.

Stage 2 decisions (agreed): the scope is the shell, the lists and the visual part of the delete window on static data; Bootstrap 5 from SCSS plus global BEM next to the components; animations through React `<ViewTransition>` plus CSS; all five sidebar items, the three without a section open a `ComingSoon` page; the search field and the add and delete buttons are drawn but disabled until their stages; the chosen order and the type filter live in the address (`?order=2`, `?type=Monitors`); a desktop layout that adapts down to a phone.

Stage 2 additions (agreed later): a working live search in the top menu (`?q=`, orders and products), smooth reflow of rows through named view transitions, staggered rows, directional page transitions by sidebar order, a faded dialog backdrop and a panel that scrolls into view on narrow screens. Stage 3 follow-up: the real API needs `q` support on `GET /orders` and `GET /products` (SQL `LIKE` in the repositories), or the client keeps filtering.

Client architecture (agreed): feature structure `app/` → `features/<name>/{components,hooks,api,store}` → `shared/`, features talk to each other only through `index.ts` (details in [CODING_RULES.md](CODING_RULES.md#client-architecture-clientsrc)).

Server architecture (agreed): feature modules `modules/<name>` with routes → service → repository layers, domain errors instead of HTTP errors in services, dependencies wired by factories in `app.ts`, file names like `orders.service.ts` (details in [CODING_RULES.md](CODING_RULES.md#server-serversrc)).

Stage 1 decisions (agreed): Liquibase changelog in YAML; DB access through `mysql2` with hand-written SQL, no ORM; prices in a separate `product_prices` table, types in `product_types`; `ON DELETE CASCADE` for products and prices when an order is deleted; the REST API includes `POST /orders` and `POST /products` (validation by hand, a library may replace it in stage 5); integration tests on a separate `dzencode_test` database; the Workbench `.mwb` file is made by reverse engineering from a live database (steps in the README), the repository holds the dump `docs/db/schema.sql`.

Stage 3 decisions (agreed): Redux Toolkit with one slice per feature and `createAsyncThunk` over the existing `request` (no RTK Query); the address stays the source of truth for the open order, the type and the search; the search runs on the server (`q` on `GET /orders` and `GET /products`, SQL `LIKE`); the mocks and `data.ts` are deleted; the first load shows skeletons, a failure shows an error block with a retry button, and a list that reloads keeps its previous rows (dimmed). Data is loaded in the browser, server prefetch stays in stage 6. Add and delete buttons stay disabled until stage 5.
