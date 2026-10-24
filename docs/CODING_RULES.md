# Coding rules

Rules to follow so that mistakes we have already found do not repeat. A new rule is added here when a remark came up again or cost time.

## Process

1. Work in stages from [PLAN.md](PLAN.md), each in a `stage/N-name` branch.
2. Discuss the details of a stage with the project owner before implementing it.
3. Do not commit or merge into `main` without an explicit OK.
4. Do not say "it works" until it is checked. In the report, name separately what is unverified (for example, Docker).
5. Stop the dev servers and processes that were started for a check once the check is done.
6. **Everything in the repository is in English:** identifiers, comments, file names, log and error messages, documentation, commit messages. The exceptions are the UI texts in components and the content of mock or seed data, which stay in Russian until i18n arrives in stage 6. Conversation with the project owner is in Russian.

## Client architecture (`client/src`)

The code is split into feature modules. Layers go strictly from top to bottom: `app` → `features` → `shared`.

```
src/
  app/                       # Next.js routes: they only assemble features
  features/<name>/           # one business area (orders, products, api-status…)
    components/<Component>/  # index.tsx (+ useX.ts, the hook of this component, + X.scss)
                             # <Name>Route is the async server component behind a page.tsx
    hooks/                   # hooks shared by several components of the feature
    api/                     # requests of the feature
    data.ts                  # what the feature's routes read (mock data now, API calls from stage 3)
    searchParams.ts          # parsing of the feature's query string
    store/                   # Redux slice of the feature (from stage 3)
    index.ts                 # public interface of the feature
  shared/                    # what several features need
    api/ config/ hooks/ ui/  # HTTP client and API types, env, shared hooks, shared UI blocks
    lib/ styles/ mocks/      # date, money and plural helpers; SCSS tokens and globals; stage 2 mock data
```

| Layer       | What is inside                                          | What must not be there                           |
| ----------- | ------------------------------------------------------- | ------------------------------------------------ |
| `app/`      | Routes, layout: they only assemble features             | Logic and requests                               |
| `features/` | Components, hooks, requests and store of one feature    | Imports from `app/`, internals of other features |
| `shared/`   | Universal pieces with no knowledge of the business area | Imports from `features/` and `app/`              |

Inside a feature the layers also go from top to bottom: `components` → `hooks` → `api`; in `shared/`: `hooks` → `api` → `config`.

1. **A component does not handle promises.** `fetch` and `await` live in `api/` and in hooks; the component receives a ready result.
2. **Where a hook lives.** A hook used by one component sits next to it, `components/X/useX.ts`. By several components of one feature: `features/<name>/hooks/`. By several features: `shared/hooks/`.
3. **A feature reaches another feature only through `index.ts`** (`@/features/orders`). Inside one feature use relative imports, between the layers of the app use the `@/` alias. Make public only what is needed outside (usually the top-level component).
4. **Container / Presentational.** The container takes data from a hook and passes it down without markup of its own. The View gets everything through props, does not go to the network, does not read env and knows nothing about the store (only local UI state is allowed).
5. **Do not split small components.** While a block is small, the container and the View sit in one `components/X/index.tsx` (the View is not exported). Split into `XContainer.tsx` and `XView.tsx` only when the file has grown noticeably or the View is needed on its own.
6. A View may import only **types** (`import type`) from the layers below.
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
9. **The data of stage 2 is mock data** in `shared/mocks/inventory.ts`, shared by both features so that they cannot drift apart. A feature reads it only through its `data.ts` (`listOrders`, `getOrder`, `listProducts`, ...) and the route component `components/XRoute` (an async server component that parses `searchParams` and loads the data); the `app/*/page.tsx` files only wrap that in `<PageTransition>`. In stage 3 `data.ts` calls the API with the same signatures, `shared/mocks` is deleted and nothing else changes. The API response types live in `shared/api/types.ts`.
10. Buttons whose logic does not exist yet (add, delete) are drawn disabled (`disabled`) with a `title` hint, not left without an action.
11. **Dialog.** `shared/ui/Modal` animates itself with CSS, independent of view transitions: the window rises and fades in, the backdrop fades in, and on closing the window and the backdrop fade out first, then the native `<dialog>` is closed. The component stays mounted and is driven by an `open` prop (set it to `false` from every close path: Escape, the backdrop, the cross, the Cancel button); a 400 ms fallback timer closes the dialog even if the browser draws no frames. Do not mount it conditionally with `{open && <Modal/>}`: that would skip the exit animation.
12. **Smooth reflow.** Give every list row a stable `name` through `<ViewTransition name="order-1" enter="none" exit="auto" share="row-move" update="row-move">`: when the panel opens or the search removes neighbours, the browser moves and resizes the row instead of jumping. A row that appears gets the CSS entrance (rule 13), not a view-transition one, so the two never animate the same row twice. The sidebar underline is one element named `nav-indicator` that exists only in the active item, so it glides between items.
13. **Rows appear one after another** with the `stagger` mixin from `shared/styles/_tokens.scss`: the component sets `--i` (the index) in an inline style, the mixin delays the animation by `min(--i, 10) * 35ms`, so the longest wait is 350 ms. It uses the `translate` property, not `transform`, so it never clashes with hover effects.
14. **Direction.** A sidebar link carries `transitionTypes={[navDirection(pathname, href)]}`: going down the list is `nav-forward`, up is `nav-back`. `PageTransition` maps these types to slide classes in `_transitions.scss`; navigation without a type (browser Back, an ordinary link) fades.
15. **Search lives in the address** (`?q=`), like the type filter and the open order: the page reads it on the server (`parseSearch`), the top menu field only updates the address (debounced 250 ms, inside `startTransition`) and keeps the other parameters (`withParam`, `toQuery` in `shared/lib/searchParams.ts`). `useSearchParams` in a layout needs a `<Suspense>` boundary, otherwise static pages fail to build. Matching is `matchesQuery` in `shared/lib/search.ts` (case-insensitive substring, serial numbers as the lists print them).

## Asynchronous code

1. Do not build `.then().catch()` chains: use `async/await` with `try/catch`.
2. A React effect cannot be `async`, so declare an `async` function inside it and call it as `void run()`.
3. A request that can be aborted gets an `AbortSignal`; `AbortError` is not treated as an error.
4. **`try/catch` for requests lives in one place:** the shared hook `useRequest(fn, { onSuccess, onError })` in `src/shared/hooks/`. It keeps the `loading / success / error` state, aborts the request on unmount and ignores `AbortError`. Hooks and components take a ready status or callbacks from it and write no `try/catch` themselves. The `api/` layer knows nothing about callbacks: it returns promises and throws `ApiError`.

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

## Environment

1. Every package has its own example: `server/.env.example` (loaded by Node through `--env-file-if-exists`), `client/.env.example` (copy it to `client/.env.local`).
2. The root `.env.example` is only for `docker compose`; a local `npm run dev` does not read it.
3. Node.js ≥ 22.9 is required (the `--env-file-if-exists` flag).

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

| Group    | Rules                                                                                                                                                | What it gives                                                                                                                              |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Promises | `no-floating-promises`, `no-misused-promises` (client and server); `no-restricted-syntax` on `.then` / `.catch` / `.finally`                         | No dangling promises and chains, as in the "Asynchronous code" section                                                                     |
| Imports  | `simple-import-sort/imports` and `/exports`, `import/no-duplicates`, `import/no-cycle`, `@typescript-eslint/consistent-type-imports` (inline `type`) | One import order (packages, then `@/`, then relative), no duplicates or cycles, types through `type`; sorting is fixed by `--fix`          |
| Layers   | `@typescript-eslint/no-restricted-imports` by `src/` folders; `no-restricted-properties` on `process.env`; `no-restricted-globals` on `fetch`        | Layers and features keep their boundaries; env is read only in `shared/config/env.ts` (client) and `config.ts` (server); network in `api/` |
| Safety   | `eqeqeq`, `no-console` (`info`, `warn`, `error` allowed), `switch-exhaustiveness-check`                                                              | Strict comparison, no forgotten `console.log`, a `switch` over a union covers every variant                                                |

Deliberately not enabled: `@typescript-eslint/no-non-null-assertion` (`!` is left to judgement) and the React style rules (`self-closing-comp`, `jsx-boolean-value`, `function-component-definition`): formatting and style stay with Prettier.

Exceptions to the client layer rules: a hook next to a component (`components/X/useX.ts`) may import `api/`, because it is the place for the requests of that component; the component itself (not the hook) may import only types (`import type`) from `api/`; `shared/config` is available to components. If a rule gets in the way instead of helping, discuss it and change it in the config rather than disabling it with an `eslint-disable` comment on the spot.
