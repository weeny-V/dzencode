# ADR 0006: CSV export in a Web Worker, a minimal PWA, and a leaner first load

Status: implemented in stage 7c; measurements and verification are in STAGE_7C_STATUS.md.

## CSV export in a Web Worker

- **Data comes from the server, the file is built in a worker.** A Server Action (`loadOrdersExport`, `loadProductsExport`) reads every row of the current search and type filter through the same cached, session-checked reads as the pages (not just the visible page). The browser hands the rows to a dedicated Web Worker that builds the document and returns its UTF-8 bytes as a transferred buffer; the page saves them as a file. A long list therefore does not block the main thread. For a few hundred rows a worker is not needed; it is there for exports of the whole filtered set.
- **Format.** UTF-8 with a byte order mark (Excel needs it for Cyrillic), CRLF line ends, a header row in the interface language. English uses a comma delimiter and a decimal point; Russian uses a semicolon and a decimal comma, because Excel with a Russian locale splits cells on semicolons. Dates are the UTC calendar date (`2017-06-29`), amounts are plain numbers per currency (no grouping, no mixing).
- **CSV injection.** Titles and descriptions are user input. A text cell that starts with `=`, `+`, `-`, `@`, a tab or a carriage return gets a leading apostrophe, so a spreadsheet does not run it as a formula. Numbers and booleans are written as they are.
- **Structure.** `shared/lib/csv` (pure builder), `shared/lib/csvWorker` (the worker body), `shared/hooks/useCsvExport` (read, build, save, cancel, late-result and session guards) and `shared/ui/ExportButton`. Each feature owns its columns (`features/orders|products/exportCsv.ts`), its worker entry and its localized button; layers stay `app` -> `features` -> `shared`.

## A minimal PWA

- **Installable** through `app/manifest.ts` (standalone, start at `/orders`, theme from the brand green) and icons rendered from the logo by `scripts/generate-pwa-icons.cjs` (192/512, maskable, Apple touch).
- **The service worker (`client/public/sw.js`) keeps two things on the device and nothing else:** the build's content-hashed static files (`/_next/static/...`, cache-first, trimmed to 150 entries) and the offline page with its icons. Pages (HTML and RSC payloads), REST, GraphQL, sockets and every authenticated response are never read from or written to a cache, so nothing of a signed-in visitor stays on the device after sign-out. A failed navigation falls back to `/offline.html`, which follows the browser's language because the app's own language cookie is HttpOnly.
- **Updates are quiet.** A new worker waits and takes over the next time the app is opened; there is no prompt and no `skipWaiting`. Old `inventory-*` caches are removed on activation. `sw.js` is served with `no-cache` so the browser always checks it.
- **Registered only in a production build and a secure context.** In development a cache would hide every change.
- **A Web Worker entry script is deliberately not served from the cache.** Turbopack passes a worker's parameters in the URL fragment, which a cached response drops: with the worker script cached, a second worker started with the first one's parameters and ran the wrong code (the products export built the orders document). The browser smoke found it; the worker has a unit test for it.

## A leaner first load

Measured with Lighthouse (mobile, simulated throttling) before and after; numbers are in the status file.

- **The title row is painted with the first HTML.** The orders, products and groups pages used to put the whole title row inside the list's Suspense boundary, so it was replaced by the streamed one (a new largest-contentful-paint element). It now sits outside, and only the count (and the products controls) stream into it.
- **The sign-in and create forms (and with them react-hook-form and zod) load in their own chunk.** They were part of the first load of every protected page through the feature barrels, although only one page needs each of them. A thin client loader (`next/dynamic`) keeps the server-rendered form in the page. Because the form's code now arrives after its HTML, the sign-in button stays disabled until React has taken the page over (`useHydrated`), and the form is `method="post"`: a native submit in that gap would otherwise put the credentials into the address.
- **The brand link has an accessible name** (its text is hidden on narrow screens).
- **Not done on purpose:** trimming Bootstrap and the shared SCSS, and the contrast of the white-on-green primary button (2.2:1 on the sign-in page), which comes from the design of the supplied screenshots and needs an owner decision.

## Consequences

- The export reads on the Next server through the cached API layer; very large inventories would need paging or streaming, which is out of scope.
- A service worker adds a deployment concern for stage 8: HTTPS, and the same origin for `sw.js`.
- The loaders add one request after hydration on the form pages (about +0.15 s of simulated LCP on the sign-in page).
