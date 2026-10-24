# Inventory — Orders & Products

SPA «Приходы / Продукты» (тестовое задание Dzencode, уровень **Middle**).
Требования — [docs/TASK.md](docs/TASK.md), план работ по этапам — [docs/PLAN.md](docs/PLAN.md).

> Статус: этап 1 (база данных и REST API). Клиент пока показывает заглушку и статус API.

## Стек

| Область        | Технологии                                    |
| -------------- | --------------------------------------------- |
| Клиент         | Next.js 16 (App Router), React 19, TypeScript |
| Сервер         | Node.js 22, Express 5, TypeScript, `mysql2`   |
| База данных    | MySQL 8.4, миграции и сид через Liquibase     |
| Качество       | ESLint, Prettier, Vitest + Supertest          |
| Инфраструктура | npm workspaces, Docker, docker-compose        |

## Структура

```
client/   Next.js приложение: app/ (маршруты), features/<name>/ (фичи), shared/ (общее)
server/   Express API: feature-модули (routes -> service -> repository -> MySQL), см. docs/CODING_RULES.md
db/       Liquibase: changelog (схема, сид) и init-скрипт MySQL
docs/     Задание, план этапов, API, схема БД, материалы (PDF, скриншоты, app.js)
```

## Запуск локально

Нужны Node.js ≥ 22.9 и Docker (для MySQL).

```bash
npm install
npm run db:up
npm run dev
```

- Клиент: http://localhost:3000
- API: http://localhost:4000/health, список методов в [docs/API.md](docs/API.md)

`npm run db:up` поднимает MySQL, ждёт его готовности и **дожидается завершения** миграций Liquibase (схема и демо-данные); команда возвращает управление, когда база готова. Повторный запуск безопасен: уже применённые changeSet'ы пропускаются. Порт `3306` на хосте должен быть свободен (если там уже стоит свой MySQL, остановите его).

Без `.env`-файлов всё работает на значениях по умолчанию. Чтобы их переопределить, скопируйте примеры каждого модуля:

| Модуль | Пример                                     | Копировать в        | Переменные                                                                                 |
| ------ | ------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------ |
| Сервер | [server/.env.example](server/.env.example) | `server/.env`       | `HOST`, `PORT`, `CLIENT_ORIGIN`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` |
| Клиент | [client/.env.example](client/.env.example) | `client/.env.local` | `NEXT_PUBLIC_API_URL`                                                                      |
| Docker | [.env.example](.env.example)               | `.env` (в корне)    | только для `docker compose` (в том числе пароли MySQL)                                     |

## Запуск в Docker

```bash
docker compose up --build
```

Поднимаются `db` (MySQL), `liquibase` (одноразовая миграция), `server` и `client`. Сервер стартует только после успешной миграции. Данные MySQL хранятся в томе `db-data`.

`NEXT_PUBLIC_API_URL` вшивается в клиент при сборке; для деплоя на сервер задайте публичный адрес API.

## База данных

Источник правды о схеме: [db/changelog](db/changelog) (YAML). Применённые changeSet'ы не редактируем, изменения вносим новым changeSet'ом.

| Таблица          | Назначение                                                              |
| ---------------- | ----------------------------------------------------------------------- |
| `orders`         | Приходы                                                                 |
| `products`       | Продукты; `order_id` (удаление прихода удаляет его продукты), `type_id` |
| `product_prices` | Цены продукта по валютам (`value`, `symbol`, `is_default`)              |
| `product_types`  | Справочник типов продуктов (для фильтра)                                |

- **Сид** (контекст `seed`) лежит в `db/changelog/data/*.csv`. Строки с id 1–3 (приходы) и 1–2 (продукты) взяты из `docs/task-materials/app.js`, остальное добавлено для демонстрации списков и фильтра.
- **Тестовая база** `<DB_NAME>_test` (по умолчанию `dzencode_test`) создаётся скриптом `db/init/01-test-database.sh` по тем же `DB_NAME` и `DB_USER`, что и основная, и получает только схему, без сида. Интеграционные тесты сервера работают именно с ней: перед `npm test` нужен `npm run db:up`. Тесты читают `server/.env`, как `npm run dev`.
- **Сбросить всё** (удалит данные в томе): `npm run db:reset`. Скрипты из `db/init` выполняются только при создании тома, поэтому после смены `DB_NAME`, `DB_USER` или паролей в `.env` тоже нужен сброс.
- **Дамп схемы:** [docs/db/schema.sql](docs/db/schema.sql) (только DDL, сгенерирован после миграций).

### Схема в MySQL Workbench

Файл `.mwb` собирает сам Workbench из живой базы:

1. `npm run db:up`.
2. Workbench: **Database → Reverse Engineer…**, подключение `127.0.0.1:3306`, пользователь `dzencode`, пароль `dzencode`.
3. Выберите схему `dzencode`, исключите служебные таблицы `DATABASECHANGELOG` и `DATABASECHANGELOGLOCK`.
4. Сохраните модель как `docs/db/schema.mwb` и закоммитьте. При необходимости расположите таблицы на диаграмме EER.

Если Workbench недоступен, открыть схему можно из [docs/db/schema.sql](docs/db/schema.sql) (**File → Open SQL Script**).

## npm scripts

| Команда                             | Что делает                      |
| ----------------------------------- | ------------------------------- |
| `npm run dev`                       | server + client в watch-режиме  |
| `npm run build` / `npm start`       | production-сборка / запуск      |
| `npm run lint`                      | ESLint в обоих пакетах          |
| `npm run typecheck`                 | TypeScript в обоих пакетах      |
| `npm test`                          | тесты (Vitest), нужен `db:up`   |
| `npm run db:up`                     | MySQL + миграции Liquibase      |
| `npm run db:reset`                  | пересоздать БД (удаляет данные) |
| `npm run format` / `format:check`   | Prettier                        |
| `npm run audit:prod`                | npm audit без dev-зависимостей  |
| `npm run docker:up` / `docker:down` | docker compose                  |
