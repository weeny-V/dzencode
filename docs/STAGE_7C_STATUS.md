# Stage 7c implementation and owner review

Branch: `stage/7c-worker-pwa`, from `main` at stage 7b (`4986d77`). The plan and the owner review checklist are in [STAGE_7C_PLAN.md](STAGE_7C_PLAN.md); decisions are in [ADR 0006](adr/0006-csv-worker-pwa-and-lean-first-load.md). The owner approved committing the stage and merging it into main after the verification below.

## Delivered behavior

- **CSV export** on Orders and Products ("Export CSV" next to the title). The current search (and the type filter) is exported in full: a Server Action reads the rows, a Web Worker builds the file (UTF-8 with BOM, CRLF, header row in the interface language, comma/decimal point for EN and semicolon/decimal comma for RU, UTC dates, one column per currency), and the page saves it. A busy state with a cancel, a failure message, late-result and session guards. Text cells that start with `=`, `+`, `-`, `@`, a tab or a carriage return get a leading apostrophe.
- **PWA:** web manifest (standalone, start at `/orders`), icons rendered from the shield logo (192/512, maskable, Apple touch) plus a favicon, a hand-written service worker (production and secure context only) and an offline page that follows the browser language. Only the build's hashed static files and the offline page with its icons are cached; navigations fall back to the offline page. Quiet update at the next open; old caches are removed on activation.
- **Front-end:** the title row of Orders, Products and Groups is outside the list's Suspense boundary (the title is painted with the first HTML, only the count streams in); the sign-in, create-order and create-product forms (and react-hook-form with zod) load in their own chunk instead of every protected page's first load; the sign-in button stays disabled until the page is hydrated and the form is `method="post"`; the brand link has an accessible name.

## Verification

Run on 2026-10-26 (Node 22.23.3, headless Edge via external Playwright and Lighthouse installations) against the isolated `dzencode6d` Docker project. No schema or server change was needed.

| Check                                                                                     | Result                   |
| ----------------------------------------------------------------------------------------- | ------------------------ |
| `npm run lint`, `npm run format:check`, `npm run typecheck`                               | pass                     |
| Server tests against the isolated database                                                | 28 files, 299 tests pass |
| Client tests                                                                              | 79 files, 543 tests pass |
| `npm run build` (server and client), `npm run audit:prod`                                 | pass, 0 vulnerabilities  |
| Docker build and start of `server` and `client`                                           | both healthy             |
| `stage7c-smoke.cjs` (CSV in EN and RU, manifest, service worker, cache contents, offline) | pass (run repeatedly)    |
| `stage7b-events-smoke.cjs`, `stage6d-browser-smoke.cjs`, `auth-browser-smoke.cjs`         | pass                     |

New tests cover the CSV builder (quoting, formula neutralization, locale, BOM, 5,000 rows), both document builders, the worker body, the export hook (worker lifecycle, cancel, late data, unmount, session end), the export Server Actions, the service worker (lifecycle, navigations never stored, static files cached and trimmed, what is left to the browser, worker scripts not intercepted, icons offline), the registration hook, the title rows and `useHydrated`.

The browser smoke downloads real files and checks them (header, quoting, `1234,5;30` in the Russian file, a neutralized `=SUM(...)` title), checks that the worker controls the page after a reload, that the Cache Storage holds only `/_next/static/*`, the icons and `/offline.html` (also after sign-out), that the offline page (with its icon) appears with the network off, and that the manifest and its icons are served.

### Lighthouse (mobile, simulated throttling), medians of the runs

Before: 3 runs on `main` (7b). After: 5 runs on this branch. Script: `scripts/stage7c-lighthouse.mjs`.

| Page      | Performance | Accessibility | LCP (s)        | Page JS (KB transferred) | Page total (KB)  |
| --------- | ----------- | ------------- | -------------- | ------------------------ | ---------------- |
| `/login`  | 99 -> 99    | 96 -> 96      | 2.11 -> 2.27   | 206.6 -> 209.2           | 280.9 -> 288.6   |
| `/orders` | 88 -> 98    | 96 -> 100     | 3.88 -> 2.43   | 243.5 -> 198.2           | 348.8 -> 309.6   |
| `/groups` | 95 -> 90\*  | 96 -> 100     | 2.87 -> 3.57\* | 291.7 -> 196.4\*         | 386.4 -> 296.9\* |

\* `/groups` varies between runs and between sets of runs (an earlier set of 5 runs on the same code gave 98 and 2.42 s with 249 KB of JS). Part of the variation is whether the Chart.js chunk (about 52 KB) is requested during the measurement, which depends on whether the charts scroll into view. Treat the `/groups` row as "not worse and 50-90 KB lighter", not as a precise figure. Lighthouse's simulated LCP is noisy by up to about one second.

What moved, and why: the orders title row no longer gets replaced when the list streams in (LCP, `/orders`); the form code and zod (about 45 KB) left the first load of every protected page; the brand link now has a name (accessibility). `/login` pays a small price: its form is a separate chunk, so its JS is 2.6 KB larger and its LCP about 0.15 s later.

## Findings left open

- The white label on the green primary button has a contrast of 2.2:1 (Lighthouse "color-contrast", `/login` accessibility 96). It comes from the supplied design; changing it is an owner decision.
- Bootstrap and the shared SCSS were not trimmed (by agreement); about 9-19 KB of CSS per page.
- CSV export reads the whole filtered list in one Server Action response. That is fine for the demo data sizes; a very large inventory would need paging or streaming.
- The service worker needs HTTPS in production (stage 8) and the same origin for `/sw.js`. Installability beyond localhost was not tested.
- Other browser engines and real devices were not tested; Edge only.
- A native form submit before hydration on the create-order and create-product forms (which carry no credentials) would still be a GET; only the sign-in form is guarded.
- No independent fresh-context review has been run on this stage.

Owner acceptance is not implied by automated checks.
