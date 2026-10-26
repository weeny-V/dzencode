# Stage 8 status

Deployment and operator self-check completed on 2026-10-26 on `stage/8-deploy`. Public demo: [dzencode-vgev.onrender.com](https://dzencode-vgev.onrender.com). The owner explicitly approved merging stage 8 into `main` on 2026-10-26; merge commit `c94e035` integrates the complete stage. Independent reviewer acceptance remains with the customer. This Git merge does not redeploy the hosted service; the recorded application deployment below remains `925d79e`.

## Deployment identity

- Source: [weeny-V/dzencode](https://github.com/weeny-V/dzencode), application commit `925d79e01472c2619410d19801102622cad8991d`.
- Render: `dzencode`, `srv-dbfhph2jnfac73cekos0`, owner-confirmed `My Workspace`, Free, Frankfurt, auto-deploy off.
- First deploy `dep-dbfhphqjnfac73cekqng`: live at 09:28:42 UTC. Control redeploy `dep-dbfhtodg1s2s73fssb70`: live at 09:36:28 UTC, same commit.
- Database: Aiven `dzencode`, project `vladkruglovfencer-dbf9`, MySQL 8.4.11; region not recorded. Credentials/CA and the persistent JWT secret are ignored local/runtime secret files.

## Implementation and evidence

The root Dockerfile builds an unprivileged container with supervised nginx, Next and Express. One public origin serves pages/Server Actions, `/api` and WebSocket upgrades. Only nginx listens publicly on the assigned port. MySQL verifies CA and hostname. The Blueprint is an alternative to direct CLI configuration, not a second configuration owner.

Liquibase applied all 14 schema/seed changeSets over verified JDBC TLS; an immediate repeat applied zero. The migrator alone uses Aiven's documented session primary-key override for Liquibase metadata. Global settings/application keys are unchanged. No test database was created on Aiven.

| Check                     | Actual result                                                                                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality                   | `npm run check`: formatting/lint/types, 201 server tests, 544 client tests, 11 runner/deployment tests passed                                                              |
| Separate production stack | 102 MySQL integration tests and 12 Chromium scenarios passed                                                                                                               |
| Combined proxy            | All 12 permanent Chromium scenarios passed; latest local peak 274 MiB at a 512 MiB cap                                                                                     |
| Blueprint                 | Official JSON Schema and Render CLI 2.31.0 validation passed                                                                                                               |
| Public auth               | HTTP redirects to HTTPS; guests rejected; browser registration works with a persistent Secure/HttpOnly/SameSite=Lax cookie hidden from JavaScript                          |
| Public data/UI            | Order/product creation, search/filter, cancel/confirm deletion, EN/RU/URL/draft restoration and filtered worker CSV passed                                                 |
| Public realtime           | WebSocket upgrade, changes in both tabs, tab counter and reconnection after offline mode passed                                                                            |
| Public reports/PWA        | GraphQL tables, lazy charts/relations, 390 px viewport, manifest/icons, service worker, offline fallback and static-only cache passed                                      |
| Hosted redeploy           | Existing cookie stayed authenticated; order/product remained and were subsequently removed                                                                                 |
| Logout                    | Current session's tabs signed out; separate login survived; both verification logins were then signed out                                                                  |
| Recovery                  | Owner-approved TLS export restored in network-isolated MySQL 8.4; complete schema/data round-trip exports were byte-identical                                              |
| Clean README startup      | Git archive of deployed commit, `npm ci`, examples/random secret, `npm run db:up` twice, `docker compose up --build --detach`; client/registration/seeded inventory passed |

Owned verification containers/volumes were removed; pre-existing Docker projects were preserved. One normal Deployment Verification participant remains; its test inventory was deleted and its sessions revoked. Private exports remain in ignored `deploy/backups`; logs/browser state remain in ignored `test-results`. Do not publish these artifacts.

In the final check, formatting/lint/types passed. The sandbox denied loopback connections (`EACCES`) in socket/HTTP unit tests; rerunning `npm run test:unit` with local network access passed all 756 tests. Earlier complete quality, integration and proxy runs also passed. The live error-level log query returned no entries after browser verification.

## Limits and handoff

Detailed hosted CPU/memory graphs require paid compute; the Free dashboard reports limits of 512 MB/0.15 CPU. No paid upgrade was made. Local memory and hosted smoke results do not establish sustained capacity. An actual 15-minute idle/wake cycle was not timed; wake instructions follow provider documentation. No off-device backup store/failover is configured. The optional map provider is unconfigured; the hosted unavailable/retry state preserved the warehouse address, and fixture tile behavior passed locally.

This is one application instance with a ten-connection MySQL pool and shared inventory. Any registered visitor can change that inventory. Use [the reviewer handoff](DEPLOYMENT_CHECKLIST.md) and [operator instructions](../deploy/README.md). Independent customer acceptance remains separate.
