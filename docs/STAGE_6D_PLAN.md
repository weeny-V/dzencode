# Stage 6d: Warehouses, charts and maps

Status: the owner merged 6b/6c into main and authorized completing their integration into 6d. Integrated verification is complete; results are recorded in [STAGE_6D_STATUS.md](STAGE_6D_STATUS.md). The owner approved committing the stage and merging it into main; publication is not authorized.

Owner amendment during implementation: use only an explicitly configured HTTPS tile source, **without an OpenStreetMap URL or any other provider by default**. An empty `NEXT_PUBLIC_MAP_TILE_URL` keeps the address fallback and shows a recoverable configuration error after Show map. This supersedes the initial-provider sentence below; caching, attribution and no-prefetch requirements still apply.

Branch: `stage/6d-charts-maps`, initially based on main `243218f` (stage 6a), now advanced to accepted main `232b07f` (merged 6b/6c). Only committed accepted changes from main were integrated; uncommitted files from other worktrees were not imported.

## Agreed choices

| Decision              | Selected behavior                                                                  | Reason and review implication                                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chart implementation  | Chart.js, selected bar-chart controllers/elements/scales and tooltips; lazy loaded | No Recharts or custom general-purpose chart engine. Verify chart code is absent from unrelated page loads.                                            |
| Interactive map       | Leaflet directly, without an additional React wrapper or map plugins; lazy loaded  | Chart.js serves the charts; Leaflet serves a street map with one marker and zoom/pan. The simpler dependency set keeps the map integration bounded.   |
| Warehouse association | Option A: zero or one warehouse per order                                          | All products of that order inherit the location. Products cannot independently select or change warehouses.                                           |
| Missing warehouse     | Allowed for both existing and newly created orders                                 | Preserve existing records. Show an explicit "Unassigned" state and include it in aggregate results. Never assign a fictional warehouse automatically. |
| Warehouse management  | Seeded demonstration reference list                                                | This is the implementation choice delegated by the owner. Provide read-only API/form options; no warehouse create/edit/delete UI or write endpoints.  |
| Reporting scope       | Current stored inventory                                                           | Counts and stored product prices, not revenue, stock-movement history, profit or currency conversion.                                                 |
| Currency              | UAH by default, explicit UAH/USD selection                                         | Values from different currencies are never added together or converted.                                                                               |

## 1. Data model and compatibility

- Add a `warehouses` table containing an id, stable unique code, display name, address, latitude and longitude. Validate lengths and coordinate ranges and enforce expressible constraints in MySQL.
- Add nullable `orders.warehouse_id` with a foreign key. Keep the product-to-order relationship unchanged; a product's location comes from its order.
- Add new Liquibase changeSets only, with filenames/ids that cannot collide with the independent auth migrations. Do not modify applied schema or seed changeSets.
- Seed a small, clearly identified demonstration warehouse list. Existing orders keep a null warehouse. Do not rewrite existing orders or infer their location from ids/titles.
- Preserve compatibility with old order requests: missing or null `warehouseId` means unassigned; a supplied id must be a valid existing warehouse. Rejected requests save nothing.
- Order reads expose the association; order details supply the warehouse metadata required by the panel. Product creation continues to select an order without a separate warehouse field.
- Warehouse removal is outside the public API. The foreign key must not silently remove an order or its inventory if a warehouse is removed by a future administrative operation.

## 2. Server modules and REST contracts

- Add a factory-composed `warehouses` module and a `GET /warehouses` endpoint for the read-only reference list.
- Add an inventory-statistics read endpoint, provisionally `GET /statistics/inventory?currency=UAH|USD`.
- Keep routes, services and repositories separate. Compose statistics through the services owning the relevant inventory data; do not bypass module boundaries with writes or duplicated business rules. SQL stays in repositories and request values use placeholders.
- Calculate aggregates on the server, without loading the entire product collection into the browser or Redux.
- Return total order count, total product count, the value in the selected currency, product counts by type and product values by warehouse, including unassigned products.
- Report how many products lack a price in the selected currency. Exclude those missing values from monetary sums without presenting them as free products. Distinguish a real zero price from a missing price.
- Count each product once regardless of how many currency-price rows it has. Orders without products still count as orders; empty warehouses have zero products/value.
- Keep the aggregate contract reusable for stage 7's GraphQL resolver. GraphQL is not introduced in 6d.

## 3. Groups page and charts

- Replace the Groups placeholder with summary cards, a product-count-by-type bar chart and a product-value-by-warehouse bar chart.
- Show exact values in an accessible HTML table alongside the charts. Tables/cards remain useful if chart loading fails; do not expose values only through canvas hover tooltips or color.
- Keep the selected currency in the URL and preserve it across navigation/refresh. Missing selection defaults to UAH; handle malformed/unsupported query values deliberately and consistently.
- Use existing design tokens, BEM styles, money/date helpers and responsive page patterns. Respect reduced motion and long labels.
- Provide explicit loading, error/retry and empty states. An empty warehouse and an entirely empty inventory must not cause division-by-zero or invalid chart scales.
- Read data through Server Components and the existing server API/cache layer. Redux remains transient UI state rather than a second inventory-data store.

## 4. Order form and warehouse map

- Add a warehouse select to the new-order form, including an explicit unassigned option. Load its options before allowing an invalid submission; failed option loading must be recoverable and must not silently discard the visitor's choice.
- In the order panel, show the warehouse name/address and a "Show map" control. A missing warehouse displays text instead of an empty/fabricated map and does not load Leaflet or map tiles.
- Load the map only after the user requests it. Show one marker for the selected order's warehouse, with zoom/pan and visible attribution.
- Switching orders must update/remount the map for the new order. Handle closing/reopening the panel, mobile layout changes and container resizing; clean up map instances, observers and listeners.
- Keep the address available when the library or tile provider is unavailable. Include a bounded/recoverable map-load failure state; the inventory panel remains usable.
- Use configurable HTTPS OpenStreetMap tiles initially, preserving visible attribution and normal browser caching. Do not add tile prefetch/offline downloads, geolocation, routing, geocoding or a map-provider account requirement.

## 5. Loading cost and cache behavior

- Import only the Chart.js modules needed for bar charts. Do not use `chart.js/auto`, register every chart type, or add a React chart wrapper without a demonstrated need.
- Defer the chart module until its section on Groups is visible. Keep a stable placeholder/table so loading does not shift the page unnecessarily.
- Keep Leaflet and its styles in the deferred map entry. Neither Chart.js nor Leaflet may leak through an eagerly imported feature barrel into the global shell or unrelated pages.
- Verify actual production chunks and browser requests before/after requesting each visualization. Record measured added JS/CSS; do not claim a bundle budget based only on package marketing sizes.
- Add explicit warehouse/statistics cache tags as needed. Successful order/product creation and deletion must invalidate affected statistics in addition to the existing inventory tags.
- Preserve the established cross-tab/direct-API freshness limits; stage 6d does not introduce the stage-7 inventory event system.

## 6. Isolation and pending integration

- Use the isolated stage-6d worktree, branch, Compose project, database/volume and non-conflicting ports. Never apply work-in-progress warehouse migrations to the owner's existing project databases during verification.
- Do not copy uncommitted 6b localization/draft changes or 6c auth changes into this branch. Do not add temporary authentication bypasses.
- Structure new feature messages/props so accepted 6b EN-default, explicit EN/RU and colocated dictionary conventions can be connected without moving all messages to the client. Locale-dependent cache identity must stay correct.
- After 6b acceptance, integrate the warehouse form field with its seven-day draft rules. Old records without a warehouse restore as unassigned; invalid/stale choices are normalized without overwriting dirty fields or newer revisions.
- After 6c acceptance/integration, protect warehouses/statistics endpoints and Groups/form reads/actions like the rest of inventory. Validate the current session before warmed cache hits; retain session-isolated keys without bearer tokens and correct 401/redirect handling.
- Preserve user-scoped drafts, transient-state reset and old-session/late-result guards from 6c. Test the new field/page in that lifecycle rather than weakening those guarantees.
- A standalone demonstration from the stage-6a base is not proof of authenticated/localized integration. Mark the independent increment and final integrated acceptance separately; do not present the full stage as complete while dependencies are pending.

## Implementation order after approval

1. Save the approved plan and baseline isolation settings; inspect existing migration identifiers and dependency peer requirements before choosing stable package versions.
2. Implement migrations/reference data, warehouse reads and backward-compatible order association, with schema/service/API tests.
3. Implement server statistics and validate counts/sums/currency coverage, empty cases and module boundaries.
4. Implement Groups cards/tables, deferred Chart.js charts, currency navigation and statistics invalidation.
5. Implement order selection, warehouse panel details and deferred Leaflet map with lifecycle/failure tests.
6. Run independent-increment checks and a fresh requirements-based reviewer; fix actionable findings and repeat until none remain. Hand over without committing/merging.
7. Once 6b/6c are accepted and integration is authorized, integrate the pending contracts, run combined auth/i18n/draft/cache/browser checks and obtain owner review of the complete stage.

## Owner review checklist

### Warehouse behavior

- [ ] An existing order still opens and retains its inventory; its warehouse is unassigned after migration.
- [ ] A new order can be created with a selected warehouse or with no warehouse.
- [ ] Products added to that order inherit its warehouse; there is no per-product warehouse selector.
- [ ] Unknown/malformed warehouse ids are rejected without partially creating an order.
- [ ] The warehouse reference list is available; warehouse-management buttons/pages/write endpoints do not exist in this scope.

### Statistics and currency

- [ ] Counts and sums match a small known fixture, including multiple products, both currencies and an unassigned order.
- [ ] A product with two currency prices increases product count by one, not two.
- [ ] Switching UAH/USD changes monetary values without conversion or mixing currencies and preserves the choice in the URL.
- [ ] A product with no price in the selected currency produces a visible missing-price count rather than a misleading free-product value.
- [ ] Empty orders, empty warehouses, zero prices and completely empty data render valid results.
- [ ] After successful creates/deletes, a new read of Groups reflects the mutation under the established tag-invalidation behavior.

### Visualization and loading

- [ ] Unrelated pages load neither chart nor map library code.
- [ ] Groups first renders useful cards/tables; chart code is requested when its section becomes visible, with correct labels and exact tabular values.
- [ ] An order panel loads no map code/tiles before "Show map"; an unassigned order never requests them.
- [ ] The selected warehouse has the correct marker/address; changing orders and resizing/reopening the panel do not show an old, clipped or duplicate map.
- [ ] Library/chunk/tile failures leave a useful page with recovery and address/data fallback.
- [ ] Keyboard access, readable mobile layout, reduced motion and map attribution remain usable.

### Integration and handover

- [ ] New migrations preserve existing records, apply on a fresh isolated database and are idempotent on a second run.
- [ ] Relevant unit, real-DB/API, DOM and browser checks pass. Automated map tests use controlled tile fixtures instead of bulk requests to public map servers; any live-provider smoke stays limited and its availability is reported honestly.
- [ ] Root lint/typecheck/test/format:check/build, relevant Docker checks and production dependency audit pass, or specific external limits are reported.
- [ ] Fresh independent review has no remaining actionable findings; no claim of absolute bug absence is made.
- [ ] All started processes/containers are stopped; existing data, other worktrees and uncommitted work are preserved.
- [ ] After accepted 6b/6c integration: EN/RU, protected APIs/actions/pages, warmed-cache guest denial, user/session transitions and warehouse drafts are verified together.
- [ ] No commit, merge into main or publication occurs without explicit owner authorization.

## Technical references

- [Chart.js selective integration](https://www.chartjs.org/docs/latest/getting-started/integration.html)
- [Leaflet API reference](https://leafletjs.com/reference.html)
- [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/)
