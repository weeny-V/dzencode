# Stage 6d integrated implementation

Branch: `stage/6d-charts-maps`, based on accepted main `232b07f` (merged 6b and 6c). Worktree: `C:\Users\Vladyslav\.codex\worktrees\4b73\dzencode-test`. The owner authorized completing this integration. After the verification below, the owner approved committing the stage and merging it into main; publication is not authorized.

## Delivered behavior

- Read-only seeded demonstration warehouses, nullable warehouse FK on orders, backward-compatible omitted/null association and inherited product location. Existing inventory is preserved.
- Server-owned inventory totals, selected UAH/USD values without conversion, missing-price coverage, zero/empty states and one count per product. All related aggregate reads share one read-only REPEATABLE READ snapshot through public module services.
- Protected Groups cards and exact tables, selected Chart.js bar modules loaded on visibility, and direct Leaflet/CSS loaded only after Show map. Maps retain address fallback, deadlines, cleanup, resize and error/retry behavior.
- Accepted 6c authorization on both new APIs and on page/form content. Session verification precedes warmed warehouse/statistics cache reads; cache identity uses non-credential user/session keys. Successful relevant mutations retain statistics invalidation. No extra Redux inventory store, auth bypass or stage-7 event system exists.
- Colocated selected-language EN/RU dictionaries. Report dictionaries remain on the server; only each visualization island's messages/locale are serialized. Amounts and chart values use shared locale-aware formatting; map zoom controls are localized.
- Warehouse fields participate in accepted seven-day versioned, user-owned order drafts. Only the newly optional warehouse field may be absent in legacy records; all other field types and TTL checks remain enforced. Stale saved selections restore unassigned; dirty fields/newer revisions retain their protections. Locale changes preserve the form, and old-session late imports cannot mount visualizations.

The owner selected **no external tile provider by default**. Set `NEXT_PUBLIC_MAP_TILE_URL` to an HTTPS XYZ template containing `{z}`, `{x}`, `{y}` before building. `NEXT_PUBLIC_MAP_TILE_ATTRIBUTION` adds escaped plain-text provider credit. Both pass through Compose build arguments. Empty configuration keeps the address and a recoverable map state without tile requests. No geolocation, geocoding, routing, offline download or prefetch is implemented.

## Isolation and verification

Only project `dzencode6d`, databases `dzencode6d` / `dzencode6d_test`, volume `dzencode6d_db-data`, and host ports DB 3364 / API 4064 / client 3064 are used. Other worktrees and databases are not verification targets. The pre-integration 6d files were backed up in this chat's visualization artifacts before advancing this branch to accepted main.

```powershell
$env:PATH = 'D:\DevTools\v22.23.3;' + $env:PATH
$env:DB_NAME = 'dzencode6d'
$env:CLIENT_ORIGIN = 'http://localhost:3064'
$env:NEXT_PUBLIC_API_URL = 'http://localhost:4064'
# Supply a persistent verification-only secret of at least 32 bytes.
$env:AUTH_JWT_SECRET = '<verification-secret>'
$env:AUTH_COOKIE_SECURE = 'false'
docker compose -p dzencode6d -f docker-compose.yml -f docker-compose.stage6d.yml up -d --wait db
docker compose -p dzencode6d -f docker-compose.yml -f docker-compose.stage6d.yml run --rm --build liquibase
$env:DB_HOST = '127.0.0.1'
$env:DB_PORT = '3364'
npm test
```

Accepted auth changesets applied to the preserved 6d app/test schemas without resets or changes to already applied warehouse sets. IDs are separate (`010/011` auth and `6d-*` warehouses). The final verification results are recorded below.

## Final verification results

Run on 2026-10-25 against the isolated `dzencode6d` project (Node 22.23.3, headless Edge via an external Playwright installation).

| Check                                                                    | Result                                                                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`, `npm run lint`, `npm run format:check`              | pass                                                                                                                |
| Client tests (jsdom and node)                                            | 59 files, 386 tests pass                                                                                            |
| Server tests against the isolated database                               | 26 files, 273 tests pass                                                                                            |
| `npm run build`                                                          | pass (server and client)                                                                                            |
| `npm run audit:prod`                                                     | 0 vulnerabilities                                                                                                   |
| Liquibase on a fresh database pair, then a second run                    | 14 changeSets on the app schema, 10 on the test schema; second run applies 0; existing orders keep a null warehouse |
| Docker build and start of `server` and `client` (project `dzencode6d`)   | both healthy                                                                                                        |
| `stage6d-browser-smoke.cjs`, controlled tile fixtures                    | pass                                                                                                                |
| `stage6d-browser-smoke.cjs`, `STAGE6D_SMOKE_MAP_MODE=unconfigured` build | pass                                                                                                                |
| `auth-browser-smoke.cjs` on the same stack                               | pass                                                                                                                |

Measured deferred assets (production build, loaded only on request; the smoke asserts they are absent from unrelated loads and before Show map): Chart.js bar chunk 146,060 B (51,659 B gzip), Leaflet chunk 149,788 B (43,349 B gzip), Leaflet CSS 10,572 B (2,649 B gzip).

The test database also receives the seeded demonstration warehouses (the changeSet has no `seed` context): the API tests use the reference list as fixed data. Product types and orders stay seed-only.

`stage6d-browser-smoke.cjs` polls the URL after sign-in/out: a sign-in starts a hard navigation and the tab's own auth-change reload, so the first navigation is aborted by design.

Review: the changes were checked against the rules in `docs/CODING_RULES.md` (SQL only in repositories with placeholders, env only in config files, Chart.js and Leaflet imported only from their deferred runtime modules). No separate fresh-context reviewer was run in this pass; the owner reviewed and approved the stage.

Cleanup: the `server`, `client` and one-shot `liquibase` containers started for verification were removed and the temporary databases dropped. The `dzencode6d` database container and volume were left as found.

## Repeatable browser verification

`scripts/stage6d-browser-smoke.cjs` targets isolated loopback services only and requires `STAGE6D_SMOKE_ALLOW_WRITES=1`. It creates demonstration accounts/orders/products and removes only its created orders in cleanup. Account fixtures stay in the isolated database; no account-management write API is added. `PLAYWRIGHT_PACKAGE` may point at an external verification-only installation, and the default browser is headless Edge.

For map checks, build with `NEXT_PUBLIC_MAP_TILE_URL=https://stage6d-tiles.invalid/{z}/{x}/{y}.png`. The test intercepts every tile and supplies controlled SVG fixtures, failures or stalled requests. It aborts unexpected external page traffic; public tile services are never used. The script checks real production chunk requests, lazy visibility, partial-tile timeout, chunk/tile recovery, markers, resize, keyboard pan, reduced motion, both languages, warehouse draft migration/ownership and guest/revoked-session denial. `STAGE6D_SMOKE_MAP_MODE=unconfigured` checks a build with an empty source instead.

The accepted `scripts/auth-browser-smoke.cjs` and `scripts/auth-rsc-smoke.cjs` remain available for broader auth lifecycle and reused-layout regressions. Their own authorization flags and isolation requirements are documented in AUTH_IMPLEMENTATION.md.

Unverified deployment scope remains the accepted stage-8 limits: a live external tile provider (none selected), HTTPS reverse-proxy deployment, other browser engines and multi-instance socket/throttle delivery. These are separate from completed 6b/6c feature integration. Owner acceptance is not implied by automated checks.
