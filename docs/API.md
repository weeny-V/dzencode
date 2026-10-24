# REST API

Base URL: `http://localhost:4000`. Request and response bodies are JSON, dates are ISO 8601 (UTC). Errors come as `{ "error": "..." }`.

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

## Examples

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

## Realtime (Socket.io)

The same server (same host and port as the REST API, same allowed client origin) also speaks Socket.io. It carries the counter of active sessions in the top menu.

| Direction        | Event            | Payload          | When                                                                          |
| ---------------- | ---------------- | ---------------- | ----------------------------------------------------------------------------- |
| server → clients | `sessions:count` | `{ "count": 3 }` | A connection opens or closes; every connected client gets it, the new one too |

- **A session is an open browser tab,** which is one socket connection (the task asks for "the open tabs"). Two tabs of one person count as two. The app opens one connection per tab and keeps it while the tab is open, so moving between pages does not change the number.
- A new client does not ask for the number: it receives `sessions:count` right after it connects. A client that loses the connection shows a dash until it reconnects (the library retries by itself) and gets a fresh number.
- A tab that is closed or loses the network is dropped after Socket.io's ping timeout (about 45 s at most); a normal close is noticed at once.
- **Limit: one server instance.** The registry of sessions lives in the memory of the Node.js process, so the number is right only while one instance runs. Several instances (or a restart of the server) would each count their own tabs; for that the Socket.io Redis adapter and a shared store would be needed. A restart resets the number, and the clients reconnect and report themselves again.
- Not covered by the REST API: there is no HTTP endpoint for the number.

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
