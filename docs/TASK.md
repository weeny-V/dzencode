# Test task: "Orders & Products" SPA, Middle level

Source materials: [task-materials/](task-materials/) (PDF, `app.js`, screenshots). The original task text is in Russian.

## Base for all levels

- Redux (global state), a component approach, routing between pages.
- Animations on transitions between routes and components.
- ES6+, third-party libraries are allowed.
- Git: a repository with a link for submission, a clear `README.md` (installation, run).
- WebSocket (Socket.io): a live counter of the open tabs of the app.
- Markup from the screenshots: BEM + Bootstrap.
- REST (Axios/Fetch), forms with validation.
- Docker: the app with its whole environment in a container.
- Deployment to a hosting/VDS (checked by a tester against a checklist).
- A DB schema file that opens in MySQL Workbench.
- Self-check: bring the project up "from scratch" by following the README.

## Screens and components

| Component          | What it does                                                                                                                                                                                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NavigationMenu** | Route links to Orders and Products                                                                                                                                                                                                                                                 |
| **TopMenu**        | Live date and time (top right corner) plus the counter of active sessions (Socket.io)                                                                                                                                                                                              |
| **Orders**         | List of orders ("приходы"): title, number of products, the date in two formats, the sum of the product prices in two currencies, a delete button that opens a confirmation popup. A click on an order opens a panel with its products next to the list (it is closed with a cross) |
| **Products**       | All products plus a filter by type (one select). Fields: title, type, guarantee dates in different formats, price in different currencies, the title of the order                                                                                                                  |

Data model (from `app.js`): `Order 1—N Product`; a product has `price[]` (value, symbol, isDefault), `guarantee {start, end}`, `isNew`, `serialNumber`, `type`, `specification`, `photo`, `date`.

> `app.js` has a syntax error (a comma is missing after `specification`). It is a data sample, not code to run.

## Junior+ (included in Middle)

TypeScript · SSR (Next.js) · Unit tests · i18n · JWT · Web Storage · Lazy Loading · Charts · Maps

## Middle (on top of Junior+)

Graph (of your choice) · GraphQL · Web Workers · PWA · Event-Driven Architecture · FrontEnd Optimization · Task Runners (npm scripts) · Integration and functional tests
