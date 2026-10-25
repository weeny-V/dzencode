# ADR 0003: Warehouse inventory reports and deferred visualizations

Status: stage 6d integrated with accepted 6b/6c; combined verification and owner review are recorded in STAGE_6D_STATUS.md.

An order has zero or one warehouse. Its products inherit that location; unassigned remains a valid state. A seeded demonstration reference list is read-only. Nullable FK association preserves old orders and accepts legacy create requests. Migration ids use the `6d-*` namespace to avoid collisions with independent auth changesets.

Statistics are server aggregates through owning-module read services. The composition root binds those readers to a single read-only REPEATABLE READ connection. This preserves module ownership and a coherent snapshot without transferring the full product collection to the browser. The statistics service is reusable by a later GraphQL resolver. Selected-currency sums exclude missing prices and disclose their count; they never mix currencies. Currency belongs to the URL/cache path, and mutations expire the statistics tag only on success.

Groups provides server-rendered cards and exact-value tables, independent of the canvas. IntersectionObserver loads only Chart.js bar controllers/elements, category/linear scales and Tooltip when a chart becomes visible. Each chart owns and destroys its instance; imports have a deadline and late-result guard, with recoverable failure. Reduced motion is respected by disabling chart animation.

The order panel defers direct Leaflet and its CSS until Show map. A panel key resets map intent when the order changes. The hook guards late imports, bounds loading, and removes map instances/observers on hiding, failure or unmount. ResizeObserver invalidates size for container changes. A DivIcon avoids Leaflet's asset-path assumptions. The address remains visible during tile/library/configuration failure.

The owner amended the initial OSM-provider choice: no tile source is configured by default. Operators may supply an HTTPS XYZ template through `NEXT_PUBLIC_MAP_TILE_URL` and additional plain-text credit through `NEXT_PUBLIC_MAP_TILE_ATTRIBUTION`, both at build time, including Docker. OSM data attribution stays visible. Provider terms must permit interactive tiles; no prefetch, offline download, routes, location, geocoding, cache bypass or account integration is added. Browser caching/referrer behavior is left intact.

The report dictionaries stay server-side; only each chart/map island's required messages and locale are serialized. Colocated EN/RU dictionaries follow the accepted 6b convention. Chart number formatting uses the shared locale-aware formatter. The warehouse field extends the existing user-owned seven-day draft with an explicitly optional legacy field; normalizing restored selections never replaces dirty fields or newer revisions. New routes/read actions use accepted 6c authentication and session-isolated cache transport. Late chart/map imports check the current auth lifetime before mounting.
