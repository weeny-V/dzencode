# REST API

Base URL: `http://localhost:4000`. Request and response bodies are JSON, dates are ISO 8601 (UTC). Errors come as `{ "error": "..." }`.

The API requires `Authorization: Bearer <JWT>` for every inventory read/write, the participant list and authenticated auth endpoints. Cookies are deliberately not accepted as REST authorization. Only `GET /health` and `POST /auth/register` / `POST /auth/login` are public. Protected and auth responses have `Cache-Control: no-store`.

Next calls REST from Server Components and Server Actions, forwarding server-only bearer credentials. Browser-to-API connections are limited to Socket.io and `GET /health`. `API_URL` controls the private Next-to-API address; `NEXT_PUBLIC_API_URL` controls the public socket/health address. Protected page content verifies the session even when Next reuses its layout during navigation. Inventory reads verify the session before warmed cache lookups and isolate cache keys by non-credential user/session ids; see [the implementation and review checklist](AUTH_IMPLEMENTATION.md). The 60-second Next tagged cache is a separate layer from the no-store HTTP API; direct REST writes do not invalidate it immediately.

The data shape follows `docs/task-materials/app.js`: `camelCase` fields, a product has a `price[]` array and a nested `guarantee { start, end }`, the product type is a string.

| Method and path        | What it does                                                                                    | Success | Errors   |
| ---------------------- | ----------------------------------------------------------------------------------------------- | ------- | -------- |
| `GET /health`          | Service status                                                                                  | 200     |          |
| `GET /orders`          | List of orders (newest first) with `productsCount` and `totals` per currency; search: `?q=text` | 200     | 400      |
| `GET /orders/:id`      | An order with all its products                                                                  | 200     | 400, 404 |
| `POST /orders`         | Create an order: `title` (required), `description`, `date` (defaults to "now")                  | 201     | 400      |
| `DELETE /orders/:id`   | Delete an order together with its products and their prices                                     | 204     | 400, 404 |
| `DELETE /products/:id` | Delete a product together with its prices; the order stays, its count and totals shrink         | 204     | 400, 404 |
| `GET /products`        | All products; filter by type `?type=Monitors`, search `?q=text`                                 | 200     | 400      |
| `POST /products`       | Create a product (body below)                                                                   | 201     | 400      |
| `GET /product-types`   | Type dictionary for the filter: `[{ id, name }]`                                                | 200     |          |

## Authentication

| Method and path       | Request                                                              | Success                           | Errors                            |
| --------------------- | -------------------------------------------------------------------- | --------------------------------- | --------------------------------- |
| `POST /auth/register` | `firstName`, `lastName`, `email`, `password`, `passwordConfirmation` | 201 `{ user, token }`             | 400, 409 duplicate email, 429     |
| `POST /auth/login`    | `email`, `password`                                                  | 200 `{ user, token }`             | 400, 401 invalid credentials, 429 |
| `POST /auth/logout`   | Bearer header, no body                                               | 204; revokes current session only | 401                               |
| `GET /auth/me`        | Bearer header                                                        | 200 `{ user, sessionId }`         | 401                               |
| `GET /users`          | Bearer header                                                        | 200 participant array             | 401                               |

User: `{ id, firstName, lastName, email, registeredAt }`. Participant: `{ id, firstName, lastName, registeredAt }`. Dates are ISO UTC strings. Other users' email and all password hashes are excluded. The participant list is newest registration first, with id as the tie-breaker.

Example registration:

```json
{
  "firstName": "Ada",
  "lastName": "Lovelace",
  "email": "ada@example.com",
  "password": "a long example password",
  "passwordConfirmation": "a long example password"
}
```

Names are trimmed and bounded to 100 characters each. Email is trimmed/lowercased, ASCII mailbox syntax, at most 254 characters (local part at most 64). Passwords are not trimmed; registration needs at least 12 characters and at most 1024 UTF-8 bytes, and exact confirmation. Unknown email and incorrect password both return 401 `{ "error": "Invalid email or password" }`. Duplicate normalized email returns 409 `{ "error": "Email is already registered" }`; concurrent duplicate registrations cannot create extra accounts/sessions.

The API returns the token to the Next server, whose Server Actions set a host-only, Path=/, HttpOnly, SameSite=Lax `dzencode_auth` cookie with a one-year max-age. `AUTH_COOKIE_SECURE=true` is required under HTTPS; local HTTP examples explicitly set `false`. The API itself does not set/clear browser cookies. Next returns no token to application client JavaScript. Logout revokes via the API before clearing the cookie; an unavailable API does not count as successful logout. A separate locale cookie stays independent. Browser auth writes are serialized across tabs until their response cookies have been applied.

JWTs use HS256 with a configured persistent random `AUTH_JWT_SECRET` (at least 32 bytes), fixed issuer/audience/type, user id, random session id and issued-at time, and deliberately no `exp`. Each authenticated request verifies both the JWT and the active MySQL session bound to its user. Revocation survives API restarts; other logins stay valid. Finite browser cookie persistence and manual cookie clearing may require login even though the JWT has no automatic expiry. No refresh token/Redis is used.

Login is limited to 20 attempts per 15 minutes per peer IP, registration to 10. Malformed attempts count. The API does not trust `X-Forwarded-For`; requests proxied through one Next instance share that IP window. Limits are process-local and reset on restart. KDF work is additionally capped at two concurrent operations per process. Excess requests return 429 `{ "error": "Too many attempts. Try again later." }` and `Retry-After` in seconds. See [ADR 0002](adr/0002-authentication.md) for the scope and deployment limits.

All inventory endpoints listed above also return 401 for missing, invalid or revoked credentials. A write already accepted before logout may complete; logout is not write cancellation.

## Examples

All inventory examples require a bearer token. The shared inventory has no per-user ownership or roles.

`GET /orders`

```json
[
  {
    "id": 1,
    "title": "Order 1",
    "description": "desc",
    "date": "2017-06-29T12:09:33.000Z",
    "productsCount": 3,
    "totals": [
      { "value": 36140, "symbol": "UAH", "isDefault": true },
      { "value": 1390, "symbol": "USD", "isDefault": false }
    ]
  }
]
```

`POST /products`

```json
{
  "title": "Monitor",
  "serialNumber": 1234,
  "isNew": true,
  "photo": "pathToFile.jpg",
  "type": "Monitors",
  "specification": "Specification 1",
  "guarantee": { "start": "2017-06-29T12:09:33Z", "end": "2019-06-29T12:09:33Z" },
  "price": [
    { "value": 100, "symbol": "USD", "isDefault": false },
    { "value": 2600, "symbol": "UAH", "isDefault": true }
  ],
  "order": 1
}
```

Optional fields of `POST /products`: `photo`, `specification`, `date` (defaults to "now"). The response contains the created product in the same shape as an item of `GET /products` (which already includes `orderTitle`).

`GET /products?type=Unknown` returns an empty array, not an error. The type is compared case-insensitively (`monitors` finds `Monitors`), a repeated parameter `?type=a&type=b` gives 400.

## Search (`q`)

`GET /orders?q=text` and `GET /products?q=text` keep the items that contain the text. The match is a case-insensitive substring (the column collation is `utf8mb4_0900_ai_ci`, so letter case and accents do not matter); `%` and `_` are plain characters, not wildcards. The text is trimmed, a blank `q` means no search, a repeated `?q=a&q=b` or a text longer than 100 characters gives 400.

| Endpoint        | Where the text is looked for                                                                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /orders`   | The order title, or the title or serial number of any of its products. A found order is returned whole: `productsCount` and `totals` still count all its products |
| `GET /products` | The product title, the serial number, the type name and the title of the order. Combines with `?type=` (both must match)                                          |

The serial number is matched as the lists print it, `SN-12345671`, so `sn-1234` finds it.

`totals` are summed over the currencies that the order's products have; an order without products returns `productsCount: 0` and an empty `totals`.

## Warehouses and inventory statistics (stage 6d)

`GET /warehouses` returns a read-only seeded demonstration list of `{ id, code, name, address, latitude, longitude }`. Codes are unique and stable. Names are limited to 100 characters, codes to 32, addresses to 255, latitude to [-90, 90] and longitude to [-180, 180]. There are no warehouse write endpoints.

`POST /orders` also accepts `warehouseId`: an existing positive INT id, null, or omitted. Omitted/null means unassigned. Malformed/unknown ids return 400 without inserting an order; the foreign key is the final validator. `GET /orders` and the create response include `warehouseId`; `GET /orders/:id` also includes `warehouse`, the complete metadata object or null. Existing orders stay unassigned after migration. Products inherit the order's warehouse; product creation has no warehouse field. A referenced warehouse cannot be removed through a future administrative DB operation without resolving its orders (`ON DELETE RESTRICT`).

The `inventoryStatistics(currency)` GraphQL query (see [GraphQL](#graphql-stage-7a); the REST `GET /statistics/inventory` of stage 6d was removed in stage 7a and now returns 404) returns current inventory, including empty orders and warehouses. An omitted currency defaults to UAH; the `Currency` enum rejects blank, lower-case and unsupported values at validation. The Groups URL deliberately normalizes unsupported/repeated currency values to UAH and exposes explicit UAH/USD links. Search does not filter this inventory-wide report.

```json
{
  "currency": "UAH",
  "ordersCount": 3,
  "productsCount": 3,
  "value": 29900,
  "missingPrices": 0,
  "byType": [{ "type": "Monitors", "productsCount": 2 }],
  "byWarehouse": [
    { "warehouseId": null, "name": null, "productsCount": 3, "value": 29900, "missingPrices": 0 }
  ]
}
```

The abbreviated example (the `data.inventoryStatistics` object) omits other type/warehouse rows. Null warehouse id/name denotes the localized Unassigned bucket. Every reference warehouse and product type is returned even with no products. Each product counts once, regardless of its price rows. Only the selected currency is summed, without conversion; a real zero is priced, while a missing price increments `missingPrices` and contributes nothing to the known-value subtotal. Per-warehouse counts include missing-price products. These are stored-inventory values, not revenue or movement history.

All aggregate reads share a read-only REPEATABLE READ transaction, composed through public module services. Concurrent writes cannot place a product in the wrong warehouse by mixing snapshots. Successful Next order/product creates/deletes expire `statistics` alongside the existing tags; warehouse reads use `warehouses`. Direct API writes and other tabs retain the documented 60-second revalidation limits. Stage 7b adds inventory events that expire the same tags in every open tab (see [Inventory events](#inventory-events-stage-7b)); writes made while no tab listens still wait for the revalidation.

The warehouse list and the GraphQL endpoint require the same active bearer session as the other inventory APIs and return 401 for guests/revoked sessions. Next verifies the session before warmed warehouse/statistics cache lookups; non-credential user/session identities remain in cache keys. Report rendering, chart numbers, map controls and form labels use the selected EN/RU locale. The warehouse field participates in the existing seven-day user-owned order draft: legacy records without the field restore unassigned, stale saved choices normalize on restore, and dirty fields/newer revisions retain the established protections.

## GraphQL (stage 7a)

`GET|POST /graphql` is a read-only GraphQL API (graphql-yoga) for analytical reads; CRUD, authentication and sessions stay on REST. It needs the same `Authorization: Bearer` session as the REST inventory endpoints and answers 401 for guests and revoked sessions. There are no mutations, GraphiQL or landing page, the handler does not widen CORS, and unexpected resolver errors are masked (`Unexpected error.`). The Next server sends queries with GET (`?query=&variables=`), so they go through the Next Data Cache with the `statistics` tag exactly like REST reads. Domain validation failures are returned as `BAD_USER_INPUT` errors with HTTP 400.

```graphql
type Query {
  inventoryStatistics(currency: Currency = UAH): InventoryStatistics!
  inventoryGraph(limit: Int = 40): InventoryGraph!
}
```

`inventoryGraph` returns the relations warehouse -> order -> product type for the orders with the most products (ties by lower id). `limit` must be an integer from 1 to 100. Node ids are `warehouse:<id>`, `warehouse:none` (orders without a warehouse; its label is null and the client localizes it), `order:<id>` and `type:<name>`; edge ids are `<source>><target>`. Every reference warehouse is always a node; product types appear only when a shown order has such products. `productsCount` on a node counts the products connected to it inside the returned graph, and `ordersTotal`/`ordersShown` tell how much was cut. The graph is read in the same REPEATABLE READ snapshot as the statistics.

```json
{
  "ordersTotal": 3,
  "ordersShown": 3,
  "nodes": [
    {
      "id": "warehouse:1",
      "kind": "WAREHOUSE",
      "label": "Kyiv demonstration warehouse",
      "productsCount": 2
    },
    { "id": "order:1", "kind": "ORDER", "label": "Order A", "productsCount": 2 },
    { "id": "type:Monitors", "kind": "PRODUCT_TYPE", "label": "Monitors", "productsCount": 1 }
  ],
  "edges": [
    {
      "id": "warehouse:1>order:1",
      "source": "warehouse:1",
      "target": "order:1",
      "productsCount": 2
    },
    {
      "id": "order:1>type:Monitors",
      "source": "order:1",
      "target": "type:Monitors",
      "productsCount": 1
    }
  ]
}
```

The example is abbreviated. On the Groups page the same data is also rendered as a table, so the canvas graph is never the only source of the values.

## Realtime (Socket.io)

The same server (same host and port as the REST API, same allowed client origin) also speaks Socket.io. It carries the counter of active sessions in the top menu and the inventory change events that keep other open tabs current.

Socket.io accepts only the `dzencode_auth` cookie containing an active signed JWT. The browser uses credentials and the same hostname as the client app; different local ports are allowed. The client uses the WebSocket transport so Origin is present even with a same-origin reverse proxy; that proxy must forward WebSocket upgrades. Do not send a token through the socket `auth` payload or localStorage. CORS permits credentials for `CLIENT_ORIGIN`; exact Origin validation also applies to polling and WebSocket handshakes/upgrades. Missing or other origins are rejected. Logout disconnects all tabs belonging to that revoked auth session, denies their reconnect and preserves sockets from other sessions. A session is rechecked after joining its revocation room before counting the tab, covering logout during handshake. Counter broadcasts go only to the separate group of fully authorized tabs; sockets still awaiting the repeated check receive no count events.

| Direction        | Event               | Payload                        | When                                                                               |
| ---------------- | ------------------- | ------------------------------ | ---------------------------------------------------------------------------------- |
| server → clients | `sessions:count`    | `{ "count": 3 }`               | An authorized tab opens or closes; every fully authorized tab receives it          |
| server → clients | `inventory:changed` | one inventory event, see below | An order or product was created or deleted by any writer (a tab, a script, a test) |

- **A counter session is an authenticated open browser tab,** which is one socket connection (the task asks for "the open tabs"). Two tabs of one person count as two. It is distinct from the persistent `auth_sessions` row, which represents one login/browser cookie and may cover several tabs. The integrated client must open one connection per protected tab and keep it while navigating.
- A new client does not ask for the number: it receives `sessions:count` right after it connects. A client that loses the connection shows a dash until it reconnects (the library retries by itself) and gets a fresh number.
- A tab that is closed or loses the network is dropped after Socket.io's ping timeout (about 45 s at most); a normal close is noticed at once.
- **Limit: one server instance.** The registry of sessions lives in the memory of the Node.js process, so the number is right only while one instance runs. Several instances (or a restart of the server) would each count their own tabs; for that the Socket.io Redis adapter and a shared store would be needed. A restart resets the number, and the clients reconnect and report themselves again.
- Not covered by the REST API: there is no HTTP endpoint for the number.

### Inventory events (stage 7b)

The services publish typed domain events on an in-process bus after a write has succeeded (never for a rejected or missing one). The bus delivers them synchronously to the handlers registered in the same process; a failing handler is logged and neither breaks the write that was already done nor the other handlers. Two handlers exist: the sessions counter (`session.opened` / `session.closed`, published when a fully authorized socket joins or leaves) and the inventory gateway, which forwards the four inventory events to every fully authorized tab. The inventory is shared by all users, so there are no per-user rooms.

| Event                                | Payload fields         |
| ------------------------------------ | ---------------------- |
| `order.created`, `order.deleted`     | `orderId`              |
| `product.created`, `product.deleted` | `productId`, `orderId` |

The payload is `{ "type": "product.deleted", "productId": 9, "orderId": 3 }`; it names what changed and carries no entity data, so a tab re-reads what it shows instead of keeping a copy. Deleting an order that has products publishes only `order.deleted` (the cascade is part of it). The tab that made a change receives its own event as well.

- **Next side.** The tab collects events for 250 ms, calls one Server Action that expires the matching Data Cache tags (the same sets the mutating actions expire; a `resync` expires `orders`, `products`, `statistics` and the umbrella tag `order-details`), and then re-renders the page's server data. This also makes a write made directly against the API visible without waiting for the 60-second revalidation. The action requires a session, accepts at most 50 known change shapes and only expires cache tags.
- **Deleted open order.** If the order shown in the panel was deleted elsewhere, the panel closes (other search parameters are kept) and a short notice appears. The check runs when the batch is flushed, so a tab that has already left the panel itself does not show it.
- **Delivery is at most once and not replayed.** There is no queue or store: an event published while a tab has no connection, or before its page's socket has connected, is lost. After a reconnect the client sends itself a `resync`, which expires and re-reads the inventory. A page rendered from a still-cached copy can stay behind until its socket connects or the 60-second revalidation passes.
- **Limit: one server instance**, as for the counter: the bus does not cross processes. Several instances would need a shared broker (for example the Socket.io Redis adapter or a message queue).

## Input rules and limits

A problem with the input is always a 400 with a readable message in `error`; a 500 means a server failure. The limits mirror the database columns.

| Field                               | Rule                                                                                                                                                                                                                  |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dates (`date`, `guarantee.*`)       | ISO 8601 only: `2017-06-29`, `2017-06-29T12:09:33Z`, `2017-06-29 12:09:33`, with an offset such as `+03:00`. A date without a time zone is UTC, milliseconds are dropped (whole seconds are stored). Years 1000–9999. |
| `guarantee.end`                     | Not earlier than `guarantee.start` (checked by both the API and the database)                                                                                                                                         |
| `serialNumber`, `order`             | An integer from 1 to 2,147,483,647                                                                                                                                                                                    |
| `title`, `photo`, `type`            | A string of at most 255 characters (`type` at most 100)                                                                                                                                                               |
| `description`, `specification`      | A string of at most 65,535 bytes (an emoji takes 4 bytes)                                                                                                                                                             |
| `price[].value`                     | A number from 0 to 9,999,999,999.99 with at most two decimal places (extra decimals are rejected, not rounded)                                                                                                        |
| `price[].symbol`                    | A currency code of up to 8 characters; upper-cased, so `usd` and `USD` are the same currency                                                                                                                          |
| `price[]`                           | A non-empty array, exactly one price with `isDefault: true`, no repeated currencies                                                                                                                                   |
| `type`, `order` in `POST /products` | Must exist (`/product-types`, `/orders`)                                                                                                                                                                              |
| Request body                        | At most 100 KB, otherwise 413; invalid JSON gives 400                                                                                                                                                                 |
