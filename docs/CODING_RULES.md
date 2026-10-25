# Coding rules

Rules to follow so that mistakes we have already found do not repeat. A new rule is added here when a remark came up again or cost time.

## Process

1. Work in stages from [PLAN.md](PLAN.md), each in a `stage/N-name` branch.
2. Discuss the details of a stage with the project owner before implementing it.
3. Do not commit or merge into `main` without an explicit OK.
4. Do not say "it works" until it is checked. In the report, name separately what is unverified (for example, Docker).
5. Stop the dev servers and processes that were started for a check once the check is done.
6. **Everything in the repository is in English:** identifiers, comments, file names, log and error messages, documentation, commit messages. Translation resources may contain their target language; user-entered and seed data keep their original language. UI text comes from component dictionaries starting in stage 6b. Conversation with the project owner is in Russian.

## Client architecture (`client/src`)

The code is split into feature modules. Layers go strictly from top to bottom: `app` → `features` → `shared`.

```
src/
  app/                       # Next.js routes: they only assemble features
  features/<name>/           # one business area (orders, products, api-status…)
    components/<Component>/  # index.tsx (+ useX.ts, the hook of this component, + X.scss)
                             # <Name>Route is the async server component behind a page.tsx (reads the address),
                             # <Name>Container connects client interaction (for example form submission)
    hooks/                   # hooks shared by several components of the feature
    api/                     # requests of the feature
    searchParams.ts          # parsing of the feature's query string
    schema.ts                # rules of the feature's forms (zod) and the form -> API body conversion
    store/                   # Redux slice when the feature owns global client state
    index.ts                 # public interface of the feature
  shared/                    # what several features need
    api/ config/ hooks/ ui/  # HTTP client and API types, env, shared hooks, shared UI blocks
    store/ lib/ styles/      # Redux dispatch helper; date, money and plural helpers; SCSS tokens and globals
```

| Layer       | What is inside                                          | What must not be there                           |
| ----------- | ------------------------------------------------------- | ------------------------------------------------ |
| `app/`      | Routes, layout: they only assemble features             | Logic and requests                               |
| `features/` | Components, hooks, requests and store of one feature    | Imports from `app/`, internals of other features |
| `shared/`   | Universal pieces with no knowledge of the business area | Imports from `features/` and `app/`              |

Inside a feature the layers also go from top to bottom: `components` → `hooks` → `api`; in `shared/`: `hooks` → `api` → `config`.

1. **Client components get ready data from hooks.** Network requests live in `api/`; lifecycle and submissions live in hooks. Async Server Components named `*.server.tsx` may await feature API functions through `loadOrError`. Forms retain their documented async submit callback.
2. **Where a hook lives.** A hook used by one component sits next to it, `components/X/useX.ts`. By several components of one feature: `features/<name>/hooks/`. By several features: `shared/hooks/`.
3. **A feature reaches another feature only through `index.ts`** (`@/features/orders`). Inside one feature use relative imports, between the layers of the app use the `@/` alias. Make public only what is needed outside (usually the top-level component).
4. **Container / Presentational.** The container takes data from a hook and passes it down without markup of its own. The View gets everything through props, does not go to the network, does not read env and knows nothing about the store (only local UI state is allowed).
5. **Do not split small components.** While a block is small, the container and the View sit in one `components/X/index.tsx` (the View is not exported). Split into `XContainer.tsx` and `XView.tsx` only when the file has grown noticeably or the View is needed on its own.
6. A View may import only **types** (`import type`) from the layers below.
   Async Server Components follow the same split: the outer function reads data and passes a completed result or a rendered slot to a synchronous View in the same file. A View never starts a request; keep both parts on the server unless interaction requires a client island.
7. Environment variables are read only in `shared/config/env.ts`; configuration does not go to `lib/`.
8. Addresses, ports and URLs are not hard-coded in components, they come from `shared/config/`.
9. A new feature is a new `features/<name>` folder following the template above; layers it does not need yet are not created in advance.
10. The linter checks the layer rules ([ESLint rules](#eslint-rules)): `shared/` does not import `features/` and `app/`, deep imports of a neighbouring feature and `fetch` outside `api/` are forbidden. A limit of the linter: a relative path into a neighbouring feature (`../../../orders/...`) is not caught, so go only through the alias.

## Client styles and animations

1. **Bootstrap 5 from SCSS plus BEM.** The global entry `shared/styles/main.scss` (imported once in `app/layout.tsx`) pulls in only the reset of Bootstrap (reboot with its CSS variables) and its `visually-hidden` helpers, about 100 KB less than the whole framework. The grid, containers and utilities are not imported: add them in `shared/styles/_bootstrap.scss` when a layout really needs them. Our own components are BEM blocks: `.order-item`, `.order-item__title`, `.order-item--compact`.
2. **A style sits next to its component:** `components/X/X.scss` with one block `.x`, imported by `import './X.scss'` in `index.tsx`. Nested elements are written as `&__elem`, modifiers as `&--mod`; do not build a cascade of two or more blocks.
3. **Tokens in one place:** colors, sizes, spacings and breakpoints live in `shared/styles/_tokens.scss` (pulled in with `@use 'tokens' as *;`, the path is set in `sassOptions.loadPaths`). The values are taken from the task screenshots; do not write a color literal in a component. Small text uses the darker `$color-text-subtle` and `$color-primary-text` (at least 4.5:1 contrast, WCAG AA); the pale design colors `$color-subtle` and `$color-primary-dark` are for icons, dots and decoration. Inline SVG reads the brand colors from the CSS variables `--color-primary` and `--color-primary-dark` (defined in `_base.scss`).
4. **How the styles combine.** Every `.scss` file is compiled on its own into plain global CSS (there is no scoping, unlike CSS Modules). The bundler groups the results into chunks and adds a `<link rel="stylesheet">` for every chunk that the components of the page need: first the global chunk (`main.scss`: Bootstrap, base, transitions), then the chunks of the components in the order the module graph imports them (for example the shell from the layout: `AppShell`, `TopMenu`, `NavigationMenu` and `ApiStatus`, then the page's own). Styles of shared components (`shared/ui/*`) and of feature components (`ApiStatus.scss`) therefore meet in one page. They do not clash because each block has its own unique BEM name, and they do not overlap because a block styles only its own elements. The files share only the tokens, which produce variables and no CSS. Since all BEM selectors have equal specificity, never rely on the order of the chunks: when two blocks must be combined, put a modifier on the outer block instead of overriding the inner block's rules.
5. **Responsiveness.** Desktop starts at `992px` (the sidebar); wider than `1200px` the order panel stands next to the list, below that it goes under it. Inside a component adapt to its own width with `@container` rather than to the screen where that fits.
6. **Animations through React `<ViewTransition>`** (works in this Next version without configuration, see `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`). A page is wrapped in `<PageTransition>` inside `page.tsx`, not in the layout. The animations of pages and the panel are classes in `shared/styles/_transitions.scss`. The shell (top menu and sidebar) gets a `view-transition-name` and is not animated. `<ViewTransition>` fires only inside a transition (route navigation, `startTransition`). Respect `prefers-reduced-motion`: `_base.scss` cuts every transition and animation short, `_transitions.scss` switches the page transitions off.
7. **A section without a page** is a normal route with `<ComingSoon>`, not an exception for an `ErrorBoundary`. Real failures are caught by `app/error.tsx`, `app/global-error.tsx` and `app/not-found.tsx` (in this Next version the recovery callback of `error.tsx` is called `retry`, not `reset`).
8. **Format dates and money with our own functions** from `shared/lib` (`date.ts`, `money.ts`), not `Intl`: the output of `Intl` differs between Node and the browser and breaks hydration. Entity dates are shown in UTC (as the API returns them), the clock in the top menu in local time and only after mounting.
9. **Server-first data (stage 6a).** Orders and products are read by async Server Components (`*.server.tsx`) through feature `api/` functions and `shared/api/server.ts` (`getJson`, `loadOrError`). The HTTP module is marked `server-only` and uses private `API_URL` (falling back to the public API URL locally). Browser REST calls are limited to `ApiStatus`'s `/health`; Socket.io keeps its own channel in `features/sessions/api/`.
   - **One owner:** inventory data lives in the Next Data Cache, not Redux. Completed JSON is cached through `unstable_cache` with tags and `revalidate: 60`; the origin fetch uses `cache: 'no-store'`. Every background cache recomputation therefore creates a fresh bounded fetch instead of relying on Next's fetch revalidation, which drops signals. Tags are `orders`, `order:<id>`, `products`, `product-types`. Server Actions expire affected tags through `updateTag`; deleting also calls `refresh()`. A client `router.refresh()` retries reads without expiring cached data. Cache Components stay disabled.
   - **Redux is client state:** `app/store.ts` mounts `sessions` and `confirmation`; `StoreProvider` creates one store per mount. Feature selectors use their own state shape, never an import of the app state.
   - **Streaming:** synchronous pages/routes return Suspense immediately. A nested async component awaits `searchParams`, keeping the no-promise-chain rule. The order panel has a separate boundary keyed by id and loads alongside the list. Form options load before the product form mounts.
   - **Loading and errors:** the initial load uses `ListSkeleton`; `loadOrError` converts API failures into serializable results, rendered by `LoadError` with a client `RetryButton`. Empty lists show `NoResults` or an empty-state message; a panel 404 stays inside the panel.
   - **Request lifecycle:** inventory API functions accept an optional caller-owned `AbortSignal` and pass it through to fetch. Explicitly signalled reads bypass the persistent shared cache, combining their signal with a server-owned 10-second timeout; unsignalled cache recomputations create a fresh timeout for each origin fetch. `React.cache` keeps render-scoped deduplication within the same caller signal identity. Independent cancellation scopes must not share a memoized promise that either caller can abort. `revalidate: 0` also bypasses the persistent cache. Do not serialize controllers/signals through Server Actions. Navigation supersession and dialog/mounted guards provide UI correctness; neither the timeout nor accepting a signal creates automatic abort-on-navigation. Do not abort a shared read globally when one visitor navigates, or treat a cancelled/timed-out write as proof that nothing was saved.
   - **Navigation:** the address owns `?order=`, `?type=`, `?q=`; search still runs in the API. Unknown types mean all products after checking the dictionary. Search/filter navigation runs in a transition and uses optimistic `data-pending`; `AppShell` dims `[data-pending-target]`. Previous rows remain while navigation is pending; `useDeferredValue` is unnecessary.
   - **Sessions:** only `sessionsChannel.ts` imports `socket.io-client`. Its hook opens one channel per tab in the persistent top menu and closes it on cleanup. Redux keeps connection status and the last count, forgetting the count on disconnection.
   - **Later stages:** stage 6c must verify cache isolation for authenticated reads before adding JWT headers. Cross-tab changes are delivered in stage 7; direct API writes become visible through revalidation. See [ADR 0001](adr/0001-server-first-data.md).
10. A button whose logic does not exist yet is drawn disabled (`disabled`) with a `title` hint, not left without an action. Nothing is drawn like that after stage 5: add and delete work.
11. **Dialog.** `shared/ui/Modal` animates itself with CSS, independent of view transitions: the window rises and fades in, the backdrop fades in, and on closing the window and the backdrop fade out first, then the native `<dialog>` is closed. The component stays mounted and is driven by an `open` prop (set it to `false` from every close path: Escape, the backdrop, the cross, the Cancel button); a 400 ms fallback timer closes the dialog even if the browser draws no frames. Do not mount it conditionally with `{open && <Modal/>}`: that would skip the exit animation.
12. **Smooth reflow.** Give every list row a stable `name` through `<ViewTransition name="order-1" enter="none" exit="auto" share="row-move" update="row-move">`: when the panel opens or the search removes neighbours, the browser moves and resizes the row instead of jumping. A row that appears gets the CSS entrance (rule 13), not a view-transition one, so the two never animate the same row twice. The sidebar underline is one element named `nav-indicator` that exists only in the active item, so it glides between items.
13. **Rows appear one after another** with the `stagger` mixin from `shared/styles/_tokens.scss`: the component sets `--i` (the index) in an inline style, the mixin delays the animation by `min(--i, 10) * 35ms`, so the longest wait is 350 ms. It uses the `translate` property, not `transform`, so it never clashes with hover effects.
14. **Direction.** A sidebar link carries `transitionTypes={[navDirection(pathname, href)]}`: going down the list is `nav-forward`, up is `nav-back`. `PageTransition` maps these types to slide classes in `_transitions.scss`; navigation without a type (browser Back, an ordinary link) fades.
15. **Search lives in the address** (`?q=`), like the type filter and the open order: the page reads it on the server (`parseSearch`), the top menu field only updates the address (debounced 250 ms, inside `startTransition`) and keeps the other parameters (`withParam`, `toQuery` in `shared/lib/searchParams.ts`). `useSearchParams` in a layout needs a `<Suspense>` boundary, otherwise static pages fail to build. The matching is done by the API: a case-insensitive substring of the title, the serial number as the lists print it (`SN-123`) and, for products, the type and the order title.
16. **Forms.** Add forms have their own pages (`/orders/new`, `/products/new?order=2`) wrapped in `PageTransition`. They use `react-hook-form`, `zod` and `@hookform/resolvers/zod` v5; schemas and `toNewX` conversions stay in the feature's `schema.ts`, common checks in `shared/lib/formSchema.ts`. The API remains the final validator.
    - Views receive an async `onSubmit` callback from a colocated hook. That hook calls the feature's Server Action, returns failure text to the form, and navigates only while `useMountedRef` is true. The shared `actionResult` helper catches transport failures. Create actions never redirect.
    - Keep `FormLayout`, `FormField`, `mode: 'onTouched'`, disabled submission while pending, date-input strings and the two fixed USD/UAH prices (UAH default; decimal commas accepted).
    - The server loads product types and unfiltered order options before mounting `ProductForm`. A valid incoming order is preselected without replacing a later visitor choice.
17. **Deletion.** Server rows render the `confirmation/DeleteButton` client island with a serializable target. It wraps the presentational `shared/ui/DeleteIconButton` and dispatches `askDelete`. Shared UI never imports a feature.
    - A single `DeleteDialogHost` sits outside the page's data Suspense boundary and rows. Its Server Actions arrive as props, avoiding feature dependency cycles. It uses `ConfirmDialog`, `ItemSummary`, `useDeletion` and a transition. Failure stays in the dialog with a retry; success expires cache tags and refreshes the server tree.
    - Closing preserves the target for the exit animation and cancels the dialog request generation. A late success must not close a newer target; a late failure must not appear in it. Deleting the currently open order removes only its `order` parameter, reading the latest committed URL through `useLatestRef`, and only while mounted.
    - Pending belongs to the current dialog operation, not every overlapping React transition. Cancelling a request must leave a new confirmation usable, including when the same item is opened again; a late completion must not clear a newer operation's pending state.
    - Inventory slices, tombstone ids and client reload thunks are no longer used.
18. **Feature dependencies.** `orders` may use the products feature's public `deleteProduct` action. Products loads its own order options through its API layer, without importing orders. Confirmation receives actions through props and imports neither domain feature. Keep the graph acyclic.

## Localization and form drafts (stage 6b)

1. English is the default. Only an explicit supported locale cookie selects Russian. The language switch keeps the current URL and form state.
2. Each page/component owns its messages/en.json and messages/ru.json. Pure messages.ts loaders import only the selected language; request-aware wrappers stay in messages.server.ts. Public feature exports remain in index.ts and must not expose server-only dependencies to client consumers.
3. The global-error recovery screen has a tiny, immediately available English fallback independent of the server and optional Russian loading. Other components load only the selected dictionary. Do not collect the application's dictionaries in the root provider. Shell, forms, filters and dialogs get their own scoped providers. Server components resolve their own text; their dictionaries are not serialized into client providers.
4. Schema validation returns stable message keys, translated next to the fields. Format entity dates in UTC and the mounted clock in local time through shared/lib helpers. Upstream error strings are not UI translations.
5. Form drafts store raw fields in localStorage, with a version and last-edit timestamp. Validate restored field types, ignore corrupt/expired records, and tolerate denied storage. Restore after hydration without overwriting dirty fields.
6. Saving a form removes only the submitted revision; a late success must preserve a newer draft. Product drafts are separated by their incoming order context, with obsolete select options cleared on restore.

## Asynchronous code

1. Do not build `.then().catch()` chains: use `async/await` with `try/catch`.
2. A React effect cannot be `async`, so declare an `async` function inside it and call it as `void run()`.
3. A request that can be aborted gets an `AbortSignal`; `AbortError` is not treated as an error.
4. **Central error handling:** browser health checks use `useRequest` (abort on cleanup, ignore `AbortError`). Server reads and actions use `loadOrError`; client action calls use `actionResult` to catch transport failures. Components and their lifecycle hooks do not duplicate request `try/catch`.
5. **Server Actions** return `{ ok: true, data } | { ok: false, error }`. Validate ids used in paths before constructing a REST URL. Invalidate only after a successful mutation, outside the API error wrapper so a cache programming error is not disguised as a failed API request.

## Server (`server/src`)

The code is split into feature modules. The root of `src/` holds only entry points (`index.ts`, `app.ts`, `config.ts`), `modules/` is responsible for the business area, `shared/` for what everything needs.

```
src/
  index.ts  app.ts  config.ts       # start-up, composition root, env
  shared/
    errors.ts                        # domain errors (NotFoundError, ValidationError)
    validation.ts                    # input check primitives
    db/                              # pool, transactions, driver errors
    http/                            # error handler
    testing/                         # helpers for integration tests (not part of the build)
  modules/<name>/
    <name>.routes.ts                 # HTTP: parse the request, call the service
    <name>.service.ts                # business rules, domain errors
    <name>.repository.ts             # SQL only
    <name>.schemas.ts                # input checks
    <name>.types.ts
    index.ts                         # public interface of the module
```

1. **Chain of layers:** routes → service → repository → DB. A route knows nothing about SQL, a repository knows nothing about HTTP and business rules, a service does not import `express`.
2. **Errors are domain errors.** A service throws `NotFoundError` / `ValidationError`, the HTTP status is decided by the single handler `shared/http/errorHandler.ts`. A repository turns driver errors into typed ones (for example `ForeignKeyViolationError`), and the service decides what they mean. Everything else becomes a 500 without details.
3. **Dependencies are assembled by factories** (`createXService({ repository, ... })`) in one place: `app.ts` (the composition root). There are no global singletons and no DI container; tests substitute the dependencies.
4. **A module reaches another module only through its `index.ts`** and only to its service (`Pick<XService, ...>` with the methods needed). The dependency graph has no cycles: `orders` → `products` → `product-types` (import cycles are forbidden by `import/no-cycle`). **A repository neither changes the tables of another module nor holds their business logic.** For reading, a `JOIN` by key for display fields is allowed (for example `products` shows the type name and the order title): otherwise every list would turn into N requests to neighbouring services. Whatever is computed or decided from the data of another module (counters, sums, rule checks) is taken from its service.
5. The linter checks the boundaries: `mysql2` only in `*.repository.ts` and `shared/db`, `express` only in `*.routes.ts`, `app.ts` and `shared/http`, deep imports of a neighbouring module are forbidden.
6. A new entity is a new `modules/<name>` folder following the template above and one line in `app.ts`.
7. Environment variables are read only in `config.ts`.
8. Log the address the server is really bound to (`formatAddress(server.address())`), not a hard-coded `localhost`.
9. Await every promise or mark it explicitly with `void` (type-aware ESLint checks this: `no-floating-promises`, `no-misused-promises`).
10. Log through `console.info` / `console.warn` / `console.error`; `console.log` is forbidden by the linter.
11. **Sockets (stage 4).** The Socket.io server is created in one place, `src/realtime.ts` (the socket counterpart of `createApp`: it attaches to the HTTP server that `index.ts` starts and wires the modules that talk over sockets). A module with a socket side has `<name>.gateway.ts` next to its routes: it receives the `Server` as an argument, listens to events and calls the service, and only imports Socket.io _types_ (the linter forbids the value import everywhere except `realtime.ts`). The service stays free of Socket.io, like it is free of Express. The event names are constants exported by the gateway and described in `docs/API.md`; the client repeats them in its `api/` file.

## Database

1. **The schema changes only through Liquibase** (`db/changelog`, YAML). Applied changeSets are never edited: every change is a new changeSet. Tables are not edited by hand.
2. **SQL is written only in `*.repository.ts`.** Parameterized queries only (`?`): strings are built from fixed fragments, values from a request are never put into SQL as text.
3. **Several related records are written in a transaction** (`withTransaction` from `shared/db/transaction.ts`): a product and its prices.
4. **The database enforces integrity wherever the schema can express it.** The existence of a parent (for example an order) is guaranteed by a foreign key, not by a preliminary SELECT: that leaves no race between the check and the insert. The guarantee period is checked by a `CHECK`. Rules that MySQL cannot express (exactly one default price) are checked by the API.
5. **Input is checked against the column limits,** otherwise MySQL answers with an error and the client gets a 500: `INT` (up to 2,147,483,647), `DECIMAL(12,2)` (up to 9,999,999,999.99 and at most two decimals), `VARCHAR(n)` counts characters, `TEXT` counts bytes (65,535), `DATETIME` with years 1000–9999.
6. **`snake_case` in the DB, `camelCase` in the API.** The repository converts; the response shape follows `app.js`.
7. **Dates** are stored as `DATETIME` in UTC with second precision and returned as ISO strings (the pool is created with `timezone: 'Z'`). Only ISO 8601 is accepted as input; a date without a time zone is UTC, milliseconds are dropped.
8. **Letter case.** Columns are compared case-insensitively (`utf8mb4_0900_ai_ci`): the filter `?type=monitors` finds `Monitors`. Currency codes are upper-cased on input.

## Server tests

1. **Three kinds of tests next to the module:** a unit test of the service with a substituted repository (`*.service.test.ts`), a test of the input checks (`*.schemas.test.ts`) and an integration test over HTTP on a real database (`*.api.test.ts`).
2. Integration tests run on the `<DB_NAME>_test` database (`npm run db:up` is needed); the data is recreated before every test through `shared/testing/database.ts`. Do not write tests that depend on the demo data of the seed.
3. Test files run one after another (`fileParallelism: false` in `server/vitest.config.mjs`) because they share one test database. The same config loads `server/.env`, like `npm run dev` does.
4. An error test checks the status and the response body, and for "nothing was saved" also the number of rows in the tables. 500 errors are tested on a substituted pool (no DB).
5. **Sockets are tested over a real connection** (`*.socket.test.ts`): the test starts the server on a free port (`listen(0)`), connects real `socket.io-client` sockets with `forceNew` and the `websocket` transport, and waits for the event with a promise created _before_ the event can arrive. No database is needed. Close the clients and the server in `afterEach`.

## Environment

1. Every package has its own example: `server/.env.example` (loaded by Node through `--env-file-if-exists`), `client/.env.example` (copy it to `client/.env.local`).
2. The root `.env.example` is only for `docker compose`; a local `npm run dev` does not read it.
3. Use Node.js `^22.22.2 || ^24.15.0 || >=26.0.0` (jsdom 30 for DOM tests). Docker uses an up-to-date `node:22-alpine` image.

## Tooling

1. **Formatting is Prettier only** (quotes, `;`, line width, commas). ESLint is responsible for code quality and does not duplicate style rules: `eslint-config-prettier` deliberately turns them off, otherwise the rules conflict.
2. The ESLint rules shared by both packages live in `eslint.shared.mjs` and are appended last in the config of each package.
3. Do not leave `any` in tests: cast `supertest` responses and the like to a type.
4. Before choosing a package version, check its peer dependencies (for example `typescript-eslint` requires TypeScript `<6.1`).
5. Do not apply `npm audit fix --force` blindly: first see whether a fixed version exists. For production dependencies use `npm run audit:prod`.
6. Scripts with a postinstall are allowed explicitly through `npm install-scripts approve`.
7. Write multi-line text to files with the file-writing tool, not with a shell heredoc: the shell breaks backticks.

## ESLint rules

The rules shared by the client and the server live in `eslint.shared.mjs`; the specifics of the client layers and the server module boundaries live in the package configs. The plugins `eslint-plugin-simple-import-sort` and `eslint-plugin-import` are installed in the root and work in both packages. The checks on the client and the server are equally type-aware (`recommendedTypeChecked`).

| Group    | Rules                                                                                                                                                                                                                          | What it gives                                                                                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Promises | `no-floating-promises`, `no-misused-promises` (client and server); `no-restricted-syntax` on `.then` / `.catch` / `.finally`                                                                                                   | No dangling promises and chains, as in the "Asynchronous code" section                                                                                                                 |
| Imports  | `simple-import-sort/imports` and `/exports`, `import/no-duplicates`, `import/no-cycle`, `@typescript-eslint/consistent-type-imports` (inline `type`)                                                                           | One import order (packages, then `@/`, then relative), no duplicates or cycles, types through `type`; sorting is fixed by `--fix`                                                      |
| Layers   | `@typescript-eslint/no-restricted-imports` by `src/` folders; `no-restricted-properties` on `process.env`; `no-restricted-globals` on `fetch`, `no-restricted-imports` on `socket.io-client` (client) and `socket.io` (server) | Layers and features keep their boundaries; env is read only in `shared/config/env.ts` (client) and `config.ts` (server); network in `api/`, the Socket.io server only in `realtime.ts` |
| Safety   | `eqeqeq`, `no-console` (`info`, `warn`, `error` allowed), `switch-exhaustiveness-check`                                                                                                                                        | Strict comparison, no forgotten `console.log`, a `switch` over a union covers every variant                                                                                            |

Deliberately not enabled: `@typescript-eslint/no-non-null-assertion` (`!` is left to judgement) and the React style rules (`self-closing-comp`, `jsx-boolean-value`, `function-component-definition`): formatting and style stay with Prettier.

Exceptions to the client layer rules: a hook next to a component (`components/X/useX.ts`) may import `api/`, because it is the place for the requests of that component; a client component itself (not the hook) may import only types (`import type`) from `api/`; async `*.server.tsx` components may import data functions; `shared/config` is available to components. If a rule gets in the way instead of helping, discuss it and change it in the config rather than disabling it with an `eslint-disable` comment on the spot.

## Client tests

1. Keep tests near the behavior they cover. `*.test.ts(x)` runs in the Node project; `*.dom.test.tsx` runs in jsdom with React Testing Library. DOM setup supplies dialog, media-query and scroll APIs; it is not a substitute for browser animation checks.
2. `src/testing/` holds fixtures, deferred promises, the store renderer and shared navigation mocks. Import the mock helper from an async `vi.mock` factory so Vitest hoisting cannot access uninitialized imports. Use `vi.hoisted` for local API/action mocks.
3. Test observable behavior and races: debounce, pending navigation, input validation, parent preselection, abandoned saves, closing/replacing a deletion dialog, local API failures and tag invalidation. Await async React `act` scopes; mark deliberately synchronous scopes with `void`.
4. Async server components can be awaited with mocked API functions and their result rendered with `renderToStaticMarkup`; substitute client islands when testing server markup. Keep real-browser checks for streaming, hydration, native dialog focus and View Transitions.
