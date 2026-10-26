# Deployment and reviewer handoff

Operator verification: 2026-10-26. The customer/reviewer performs independent acceptance against the original task requirements.

## Deployment identity

| Field                         | Value                                                                                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public HTTPS URL              | [dzencode-vgev.onrender.com](https://dzencode-vgev.onrender.com)                                                                                            |
| Source / deployed application | [weeny-V/dzencode](https://github.com/weeny-V/dzencode), `stage/8-deploy`, commit `925d79e01472c2619410d19801102622cad8991d`                                |
| Host                          | Render Free, Frankfurt, `My Workspace`, service `dzencode`; auto-deploy off                                                                                 |
| Persistent database           | Aiven MySQL Free 8.4.11, service `dzencode`, project `vladkruglovfencer-dbf9`; region not recorded                                                          |
| Limits                        | Render: 512 MB/0.15 CPU; 15-minute idle sleep and approximately one-minute wake per provider documentation; free quotas and Aiven inactivity policies apply |

Register a demonstration account; no shared password is needed. Do not enter confidential or real personal data into this shared demo.

## Operator self-check

- [x] Clean snapshot installs with `npm ci` and starts using the README's Docker instructions, examples and random secret.
- [x] Real secrets, CA and backups are ignored by Git and excluded from Docker build contexts.
- [x] Aiven TLS/hostname verification, 14 migrations and unchanged reapplication passed.
- [x] Startup reports actual addresses and serves health through the public port.
- [x] Public HTTPS redirect, Secure cookies and WebSocket upgrade work.
- [x] Local proxy suite passed at 512 MB (274 MiB peak); live demo passed. Detailed hosted resource graphs require paid compute and were not measured.
- [x] Hosted redeploy preserved records and the active cookie/JWT secret.
- [x] Owner-approved export restored into offline MySQL; the full reverse export matched byte for byte.
- [x] Quality checks, 102 integration tests and 12 permanent browser scenarios passed; see [stage evidence](STAGE_8_STATUS.md).
- [x] Owned temporary containers/volumes were removed; test orders/products were deleted and logins signed out. One ordinary verification participant remains.

## Public demo observations

- [x] Registration/login work; guests cannot read protected pages/API.
- [x] Order/product creation, search/filter, cancelled and confirmed deletion work.
- [x] EN/RU preserves URL/fields; reload restores drafts and saving clears them.
- [x] Tabs receive changes, counts update and the page reconnects after offline mode.
- [x] Logout signs out the current login's tabs while preserving a separate login.
- [x] Groups tables/charts/relations render. The optional map provider is unconfigured; addresses and the unavailable/retry state remain available.
- [x] Filtered worker CSV downloads. EN passed live; EN/RU formatting passed the permanent local suite.
- [x] Manifest/icons/service worker use HTTPS; offline fallback works and cache inspection contains only static/offline assets.
- [x] The checked 390 px Groups viewport has no document horizontal overflow.
- [ ] An actual idle sleep/wake cycle has been timed. Instructions currently use provider documentation; no keep-awake monitor is installed.

## Reviewer route

1. Open the demo, allow about a minute if Render is waking, then register at `/register`.
2. Create/search/filter/delete disposable orders/products. All accounts see the same inventory; preserve other visitors' records and seed data.
3. Switch EN/RU, try a saved form draft and open a second tab for inventory events/session counts.
4. Open Groups for totals, charts and relations. Warehouse addresses work; external map tiles require a separately configured provider.
5. Export a filtered CSV. After an online visit, disconnect the browser and navigate to try the offline page.
6. Sign out when finished. Another login restores access if cookies were cleared.

The health route checks the process, not database readiness. For failures after inactivity, check Render deploy/log state and Aiven Running state. Operator commands, backup privacy and recovery steps are in [deploy/README.md](../deploy/README.md). No destructive live reset, paid upgrade, external backup storage, high availability or independent acceptance is implied. Stage 8 has not been merged into `main`.
