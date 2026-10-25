# Inventory — Orders & Products

An "Orders / Products" SPA (Dzencode test task, **Middle** level). Requirements: [docs/TASK.md](docs/TASK.md). Work plan by stages: [docs/PLAN.md](docs/PLAN.md).

> Status: stage 6a implementation. Orders and Products render API data on the Next server; forms and confirmed deletion use Server Actions. Redux owns the live session counter and confirmation UI. Groups, Users and Settings still show a coming-soon page. RU/EN is planned for 6b; JWT for 6c; charts/maps for 6d.

## Stack

| Area           | Technologies                                                            |
| -------------- | ----------------------------------------------------------------------- |
| Client         | Next.js 16 (App Router), React 19, TypeScript, Bootstrap 5 (SCSS) + BEM |
| Server         | Node.js 22, Express 5, TypeScript, `mysql2`                             |
| Database       | MySQL 8.4, migrations and seed through Liquibase                        |
| Quality        | ESLint, Prettier, Vitest + Supertest + React Testing Library/jsdom      |
| Infrastructure | npm workspaces, Docker, docker-compose                                  |

## Structure

```
client/   Next.js app: app/ (routes), features/<name>/ (features), shared/ (common code)
server/   Express API: feature modules (routes -> service -> repository -> MySQL), see docs/CODING_RULES.md
db/       Liquibase: changelog (schema, seed) and the MySQL init script
docs/     Task, stage plan, API, DB schema, materials (PDF, screenshots, app.js)
```

## Run locally

You need Node.js 22.22.2+ (22.x), 24.15+ (24.x), or 26+, and Docker for MySQL. jsdom 30 sets this runtime requirement for tests.

```bash
npm install
npm run db:up
npm run dev
```

- Client: http://localhost:3000
- API: http://localhost:4000/health, the list of methods is in [docs/API.md](docs/API.md)

`npm run db:up` starts MySQL, waits until it is ready and **waits for the Liquibase migrations to finish** (schema and demo data); the command returns when the database is ready. Running it again is safe: changeSets that are already applied are skipped. Port `3306` on the host must be free (stop your own MySQL if one is running there).

Without `.env` files everything works on the default values. To override them, copy the examples of each package:

| Package | Example                                    | Copy to              | Variables                                                                                  |
| ------- | ------------------------------------------ | -------------------- | ------------------------------------------------------------------------------------------ |
| Server  | [server/.env.example](server/.env.example) | `server/.env`        | `HOST`, `PORT`, `CLIENT_ORIGIN`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` |
| Client  | [client/.env.example](client/.env.example) | `client/.env.local`  | `NEXT_PUBLIC_API_URL`, `API_URL`                                                           |
| Docker  | [.env.example](.env.example)               | `.env` (in the root) | only for `docker compose` (including the MySQL passwords)                                  |

## Run in Docker

```bash
docker compose up --build
```

This starts `db` (MySQL), `liquibase` (a one-shot migration), `server` and `client`. The server starts only after a successful migration. MySQL data lives in the `db-data` volume. The client image build downloads the Google font, so it needs internet access.

`NEXT_PUBLIC_API_URL` is baked into the browser bundle at build time and is used for Socket.io and the health indicator. `API_URL` is private runtime configuration for Next's inventory REST calls; locally it falls back to `NEXT_PUBLIC_API_URL` and then `http://localhost:4000`. Compose defaults it to `http://server:4000`, reachable from the client container. Changing the public URL requires rebuilding the image.

Inventory uses Server Components and Server Actions with tagged Next caching (60-second revalidation). Redux manages global client state (sessions and the confirmation target); inventory data itself is not stored in Redux. The API still validates inputs and performs CRUD through REST. See [ADR 0001](docs/adr/0001-server-first-data.md) for the decision and the RTK Query alternative.

## Database

The source of truth for the schema is [db/changelog](db/changelog) (YAML). Applied changeSets are never edited; changes go into a new changeSet.

| Table            | Purpose                                                                  |
| ---------------- | ------------------------------------------------------------------------ |
| `orders`         | Orders                                                                   |
| `products`       | Products; `order_id` (deleting an order deletes its products), `type_id` |
| `product_prices` | Prices of a product per currency (`value`, `symbol`, `is_default`)       |
| `product_types`  | Dictionary of product types (for the filter)                             |

- **Seed** (context `seed`) lives in `db/changelog/data/*.csv`. Rows with ids 1–3 (orders) and 1–2 (products) are taken from `docs/task-materials/app.js`, the rest is added to demonstrate the lists and the filter.
- **Test database** `<DB_NAME>_test` (`dzencode_test` by default) is created by the script `db/init/01-test-database.sh` from the same `DB_NAME` and `DB_USER` as the main one, and gets only the schema, without the seed. The server's integration tests run against it: `npm run db:up` is needed before `npm test`. The tests read `server/.env` like `npm run dev` does.
- **Reset everything** (deletes the data in the volume): `npm run db:reset`. The scripts in `db/init` run only when the volume is created, so a reset is also needed after changing `DB_NAME`, `DB_USER` or the passwords in `.env`.
- **Schema dump:** [docs/db/schema.sql](docs/db/schema.sql) (DDL only, generated after the migrations).

### Schema in MySQL Workbench

The `.mwb` file is built by Workbench itself from a live database:

1. `npm run db:up`.
2. Workbench: **Database → Reverse Engineer…**, connection `127.0.0.1:3306`, user `dzencode`, password `dzencode`.
3. Choose the `dzencode` schema, exclude the service tables `DATABASECHANGELOG` and `DATABASECHANGELOGLOCK`.
4. Save the model as `docs/db/schema.mwb` and commit it. Arrange the tables on the EER diagram if you like.

If Workbench is not available, the schema can be opened from [docs/db/schema.sql](docs/db/schema.sql) (**File → Open SQL Script**).

## npm scripts

| Command                             | What it does                                                        |
| ----------------------------------- | ------------------------------------------------------------------- |
| `npm run dev`                       | server + client in watch mode                                       |
| `npm run build` / `npm start`       | production build / run                                              |
| `npm run lint`                      | ESLint in all packages                                              |
| `npm run typecheck`                 | TypeScript in all packages                                          |
| `npm test`                          | tests (Vitest), the server needs `db:up`; client includes DOM tests |
| `npm run db:up`                     | MySQL + Liquibase migrations                                        |
| `npm run db:reset`                  | recreate the DB (deletes the data)                                  |
| `npm run format` / `format:check`   | Prettier                                                            |
| `npm run audit:prod`                | npm audit without dev dependencies                                  |
| `npm run docker:up` / `docker:down` | docker compose                                                      |
