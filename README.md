# Inventory — Orders & Products

An "Orders / Products" SPA (Dzencode test task, **Middle** level). Requirements: [docs/TASK.md](docs/TASK.md). Work plan by stages: [docs/PLAN.md](docs/PLAN.md).

> Status: stage 6d is integrated with accepted 6b localization/drafts and 6c authentication. Groups provides warehouse inventory statistics and lazy Chart.js bars; order forms/panels include an optional warehouse and deferred Leaflet map. See [stage 6d verification and owner review](docs/STAGE_6D_STATUS.md) and the accepted [authentication contract](docs/AUTH_IMPLEMENTATION.md).

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
# Copy server/.env.example to server/.env and .env.example to .env.
# Generate a secret and put it in AUTH_JWT_SECRET in both files:
node -e "console.info(require('node:crypto').randomBytes(32).toString('hex'))"
npm run db:up
npm run dev
```

- Client: http://localhost:3000
- API: http://localhost:4000/health, the list of methods is in [docs/API.md](docs/API.md)

`npm run db:up` starts MySQL, waits until it is ready and **waits for the Liquibase migrations to finish** (schema and demo data); the command returns when the database is ready. Running it again is safe: changeSets that are already applied are skipped. Port `3306` on the host must be free (stop your own MySQL if one is running there).

The API requires a persistent random `AUTH_JWT_SECRET` of at least 32 bytes; it refuses a missing/short secret. Keep the real value out of Git. Copy the examples of each package and set the secret in `server/.env` for local API startup and in root `.env` for Compose. Database/address defaults remain available:

| Package | Example                                    | Copy to              | Variables                                                                                                     |
| ------- | ------------------------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------- |
| Server  | [server/.env.example](server/.env.example) | `server/.env`        | `HOST`, `PORT`, `CLIENT_ORIGIN`, `AUTH_JWT_SECRET`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` |
| Client  | [client/.env.example](client/.env.example) | `client/.env.local`  | `NEXT_PUBLIC_API_URL`, `API_URL`, `AUTH_COOKIE_SECURE`                                                        |
| Docker  | [.env.example](.env.example)               | `.env` (in the root) | only for `docker compose` (including the MySQL passwords)                                                     |

## Run in Docker

```bash
docker compose up --build
```

This starts `db` (MySQL), `liquibase` (a one-shot migration), `server` and `client`. The server starts only after a successful migration. MySQL data lives in the `db-data` volume. The client image build downloads the Google font, so it needs internet access.

Set `AUTH_JWT_SECRET` in root `.env` first. Compose rejects an empty value. Open `/register` to create an account, then use `/login` and the top-menu Sign out button. All authenticated users share the same inventory. Users shows your email and public participant names/dates. Logout revokes the current session and its open tabs, leaving other devices' sessions active. JWTs deliberately have no expiry; the HttpOnly cookie persists for one year. Losing the cookie requires another login; see [ADR 0002](docs/adr/0002-authentication.md).

Use the same hostname for client and API (local ports may differ); do not mix `localhost` and `127.0.0.1`. Set `CLIENT_ORIGIN` to the exact client origin. Socket.io requires WebSocket forwarding and rejects missing/untrusted Origin. Use HTTPS outside local development and set `AUTH_COOKIE_SECURE=true` in `client/.env.local` or root `.env` for Compose. Local HTTP examples explicitly use `false`; the client otherwise defaults to Secure in production. Auth tokens stay server-only; passwords are submitted only for authentication and never stored in browser storage or Redux. Cross-tab cookie mutations use Web Locks, with an empty IndexedDB mutex on ordinary HTTP; if both coordination mechanisms are unavailable, the auth operation fails safely rather than racing another tab.

`NEXT_PUBLIC_API_URL` is baked into the browser bundle at build time and is used for Socket.io and the health indicator. `API_URL` is private runtime configuration for Next's inventory REST calls; locally it falls back to `NEXT_PUBLIC_API_URL` and then `http://localhost:4000`. Compose defaults it to `http://server:4000`, reachable from the client container. Changing the public URL requires rebuilding the image.

Inventory uses Server Components and Server Actions with tagged Next caching (60-second revalidation). The current session is verified before every cache access, and keys include non-credential session/user ids. Redux manages global client state (sessions and the confirmation target); inventory data itself is not stored in Redux. Auth changes remount that state and synchronize tabs without transmitting credentials. Form drafts last seven days and belong to their user and form context; legacy anonymous drafts are not adopted. The API still validates inputs and performs CRUD through REST. See [ADR 0001](docs/adr/0001-server-first-data.md) for the cache decision.

## Database

The source of truth for the schema is [db/changelog](db/changelog) (YAML). Applied changeSets are never edited; changes go into a new changeSet.

| Table            | Purpose                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `orders`         | Orders with a nullable warehouse; old records remain unassigned                           |
| `warehouses`     | Read-only demonstration reference: stable code, name, address and coordinates             |
| `products`       | Products; `order_id` (deleting an order deletes its products), `type_id`                  |
| `product_prices` | Prices of a product per currency (`value`, `symbol`, `is_default`)                        |
| `product_types`  | Dictionary of product types (for the filter)                                              |
| `users`          | Normalized unique email, names, registration date and salted password hash                |
| `auth_sessions`  | Persistent per-login session ids and revocation dates; distinct from the open-tab counter |

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
