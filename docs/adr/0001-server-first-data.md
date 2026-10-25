# ADR 0001: Server-first inventory data

Status: accepted for stage 6a.

## Context

Stages 3 and 5 loaded orders and products in the browser through Redux Toolkit thunks. SSR in stage 6 needs inventory data in the initial HTML. Keeping those slices alongside a server cache would introduce two owners of the same data. Stage 6c also needs JWT credentials to stay on the Next server.

## Decision

- Next Server Components read the existing Express REST API through `shared/api/http.ts` and `shared/api/server.ts`. `server-only` prevents this code from entering a browser bundle.
- Data-bearing Server Components keep their async orchestration separate from a synchronous, colocated View. Views receive completed results or rendered content slots; they do not start API reads. Both parts remain server-rendered.
- Server Actions perform mutations. The API remains the final input validator; actions validate path ids before constructing a URL. Actions return serializable success/error results. A shared client helper also catches failures reaching Next itself.
- The Next Data Cache owns inventory data. `unstable_cache` stores completed JSON with a 60-second revalidation interval and tags: `orders`, `order:<id>`, `products`, `product-types`. Its key includes the private API origin, path/query, TTL and tags. Cache Components stay disabled; `unstable_cache` is the supported cache API for this configuration.
- Creating/deleting an order expires `orders`, its `order:<id>` and `products` (deletion cascades). Creating/deleting a product expires `products`, `orders` and its parent's `order:<id>`. `updateTag` ensures the next read waits for fresh data. Deletion also calls `refresh()`.
- Redux owns only global client state: sessions and the deletion confirmation target. The root provider remains per mount. Server-rendered rows contain `confirmation/DeleteButton`, wrapping the shared icon button so shared UI never imports features.
- A page has one `DeleteDialogHost` outside the inventory Suspense boundary. It receives Server Actions as props; confirmation has no dependency on either inventory feature. Closing preserves the summary for the exit animation.
- The URL owns search, type and the selected order. Navigation runs in a transition. Optimistic `data-pending` marks the search/filter island; the shell dims existing rows until the server response arrives. Row and panel View Transitions remain.
- Synchronous pages/routes render Suspense immediately. A nested async component awaits `searchParams`; this preserves the repository's prohibition on `.then()` chains. The panel has a boundary keyed by order id and starts loading alongside the list.
- Product types and products initially load in parallel. An unknown type triggers an unfiltered read; known types reuse the case-insensitive API result. Product form options load on the server before the form mounts.
- Create actions do not redirect. The mounted form decides where to navigate after a successful save. A late deletion uses the latest URL and never closes a newer confirmation target.
- All inventory API functions accept an optional caller-owned `AbortSignal`. Callers on the Next server can pass `controller.signal` and call `controller.abort()` to cancel their requests. Signals are not serialized through Server Actions from the browser.
- Each origin REST read creates a server-owned 10-second timeout and uses `cache: 'no-store'`. When cached JSON is stale, Next re-runs the loader, which creates a fresh signal covering headers and the response body. Caching the JSON rather than the fetch is necessary because Next's stale-fetch revalidation explicitly removes the original signal. A regression test runs the installed Next cache and patched-fetch implementations for stalled headers and stalled bodies.
- Explicitly signalled reads bypass the persistent cache and combine the caller signal with the read timeout through `AbortSignal.any`. They can therefore abort the actual origin request without cancelling a background refresh shared by other visitors. `revalidate: 0` also bypasses the persistent cache. `React.cache` preserves render-scoped deduplication using API origin, URL, TTL, tags and caller signal identity. The HTTP wrapper checks cancellation before fetch and before returning parsed data.
- Abandoning a route does not guarantee immediate cancellation of the Next-to-Express request: it may complete and populate its URL-specific cache entry before the timeout. Next discards superseded navigation state; dialog generations and mounted guards discard obsolete client effects. None of these mechanisms cancel or roll back mutations. The browser health request retains its AbortController cleanup.

`API_URL` is private runtime configuration for Next (`http://server:4000` in Compose). `NEXT_PUBLIC_API_URL` remains the public build-time address for Socket.io and `/health`; those are the only browser-to-API connections. CORS stays enabled.

## Consequences and limits

- Inventory appears in server-rendered HTML without Redux hydration or browser REST requests. The existing API, schema and form validation remain usable.
- Direct API writes and other tabs do not receive immediate cache invalidation. The 60-second revalidation interval provides eventual freshness; cross-tab events belong to stage 7. A client refresh alone does not expire the Data Cache.
- A read timeout is a resource bound, not the correctness mechanism for navigation races. Search/filter URLs have distinct cache keys, and a superseded RSC navigation does not replace the current route. Aborting a request does not promise to cancel a database query that Express already started. Write requests accept an explicit caller signal but are not automatically retried or given the read timeout: a transport failure or cancellation can happen after the API committed the write. Mounted and dialog generation guards remain necessary.
- Before stage 6c, decide whether authenticated reads are private or shareable and verify cache isolation with JWT headers. Authentication is not implemented by this ADR.
- DOM tests use React Testing Library and jsdom (`*.dom.test.tsx`). Unit tests cover tagged requests, action invalidation and server markup. Tests preserve dialog, navigation and abandoned-form race handling.
- The assignment requires Redux for global state and REST. Both remain, but a reviewer might expect inventory data itself in Redux. This choice is explicit in the README.

## Alternative

If the assignment owner explicitly requires inventory data in Redux, switch the isolated API integration to RTK Query with `providesTags`/`invalidatesTags` and SSR hydration. Do not add a second client data cache in advance.

REST remains the CRUD interface. Stage 7 adds GraphQL for aggregate reads in Groups, rather than duplicating CRUD endpoints.
