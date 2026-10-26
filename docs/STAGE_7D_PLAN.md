# Stage 7d: reproducible checks and browser acceptance

Branch: `stage/7d-tests-scripts`, from `main` at `b913d2b` (accepted stage 7c). The owner agreed to the scope before implementation: npm scripts, integration tests, a permanent Chromium Playwright suite and an isolated local run. No CI or additional browser engines in this stage.

## Commands and infrastructure

- `check`: Prettier, ESLint, TypeScript, server tests without MySQL, client Node/DOM tests and runner lifecycle tests.
- `test:integration`: fresh MySQL and Liquibase, API and repository tests against `dzencode_e2e_test`.
- `test:e2e`: fresh seeded `dzencode_e2e`, production API/client builds and Chromium tests.
- `test:system`: integration first, then production E2E, using separate schemas in one owned stack.
- `test:e2e:install`, `test:e2e:list`, `test:e2e:report`: browser installation, discovery and diagnostics.
- Keep `npm test` as all Vitest tests using the existing local configuration.

The runner supplies the project name `dzencode-tests-<pid>`, fixed test-only credentials and loopback ports 3374/4074/3074. It never reads application `.env` files for Compose. It owns a lock outside Playwright's output directory, applies migrations before checks and always attempts teardown in `finally`. Failure logs, screenshots, traces and HTML reports support debugging. Forced termination or an unavailable Docker daemon can require the documented manual cleanup. Application data and existing Compose projects must remain untouched.

Server Vitest projects separate database API/repository tests from the no-MySQL group. Files that share the integration schema run sequentially. The client retains its existing Node/jsdom projects. E2E runs with one worker and no retries; each test gets a fresh browser context and a unique inventory prefix. Test-created orders are cleaned up through REST; accounts/sessions disappear with the disposable volume. A worker account has a separate API session so signing out a browser cannot break fixture cleanup. No persisted real credentials or committed browser storage state.

## Acceptance scenarios

| Area                | Browser observations                                                                                                                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication      | Protected routes/APIs reject guests and tampered cookies; registration validates fields; HttpOnly cookie persists across tabs; warmed authenticated reads are denied after logout; another login survives |
| Inventory           | Create an order and preselected product; reject reversed warranty; debounced search/type filter survive reload; cancel and confirm native deletion dialog; remove product and order                       |
| Localization/drafts | EN/RU preserves fields and URL; reload restores a draft; saving removes it                                                                                                                                |
| Form hydration      | Without JavaScript, both create forms disable inputs and submit and use POST                                                                                                                              |
| Realtime            | Two tabs receive REST writes without a reload; product count and Groups update; deleted panel closes with notice and retains search; closing a tab lowers the count; reconnect recovers missed writes     |
| Groups              | UI totals match GraphQL; charts and relations draw after scrolling into view; graph nodes remain visible; currency survives reload                                                                        |
| Map                 | No tiles before Show map; controlled fixture tiles only; failed tiles retain the address and can be retried; hide and mobile layout                                                                       |
| CSV                 | Real worker and downloads; current search/type only; EN/RU headers/delimiters/decimals; BOM, quoting, per-currency totals and formula neutralization                                                      |
| PWA                 | Manifest and icons; production service worker controls after reload; cache contains static files/offline content only; offline navigation and image; no personal cached responses after logout            |

## Integration additions

Retain the existing real-MySQL API, constraints, transaction, authentication, GraphQL and socket/event tests. Add a cross-layer regression: after a product write is announced over a real socket, both prices are readable through the order API and GraphQL counts/value reflect the change; deletion returns the aggregates to their previous values. Subscribe before writes to avoid missing an early event.

## Owner review

- [ ] `npm run check` passes without Docker or MySQL.
- [ ] `npm run test:system` starts from a fresh volume, passes and removes its stack.
- [ ] A failing scenario produces a trace/screenshot/report and still removes its stack.
- [ ] A second managed run cannot compete for ports while the first owns the lock.
- [ ] Production builds and production dependency audit pass.
- [ ] README commands and limitations match the delivered behavior.
- [ ] Review the small hydration fix found by the browser suite.
- [ ] No commit or merge into `main` without the owner's explicit approval.
