# Inventory — Orders & Products

SPA «Приходы / Продукты» (тестовое задание Dzencode, уровень **Middle**).
Требования — [docs/TASK.md](docs/TASK.md), план работ по этапам — [docs/PLAN.md](docs/PLAN.md).

> Статус: этап 0 (каркас). Приложение показывает заглушку и статус API.

## Стек

| Область        | Технологии                                    |
| -------------- | --------------------------------------------- |
| Клиент         | Next.js 16 (App Router), React 19, TypeScript |
| Сервер         | Node.js 22, Express 5, TypeScript             |
| Качество       | ESLint, Prettier, Vitest + Supertest          |
| Инфраструктура | npm workspaces, Docker, docker-compose        |

## Структура

```
client/   Next.js приложение
server/   Express API
docs/     Задание, план этапов, материалы (PDF, скриншоты, app.js)
```

## Запуск локально

Нужен Node.js ≥ 22.9.

```bash
npm install
npm run dev
```

- Клиент: http://localhost:3000
- API: http://localhost:4000/health

Без `.env`-файлов всё работает на значениях по умолчанию. Чтобы их переопределить, скопируйте примеры каждого модуля:

| Модуль | Пример                                     | Копировать в        | Переменные                      |
| ------ | ------------------------------------------ | ------------------- | ------------------------------- |
| Сервер | [server/.env.example](server/.env.example) | `server/.env`       | `HOST`, `PORT`, `CLIENT_ORIGIN` |
| Клиент | [client/.env.example](client/.env.example) | `client/.env.local` | `NEXT_PUBLIC_API_URL`           |
| Docker | [.env.example](.env.example)               | `.env` (в корне)    | только для `docker compose`     |

## Запуск в Docker

```bash
docker compose up --build
```

`NEXT_PUBLIC_API_URL` вшивается в клиент при сборке; для деплоя на сервер задайте публичный адрес API.

## npm scripts

| Команда                             | Что делает                     |
| ----------------------------------- | ------------------------------ |
| `npm run dev`                       | server + client в watch-режиме |
| `npm run build` / `npm start`       | production-сборка / запуск     |
| `npm run lint`                      | ESLint в обоих пакетах         |
| `npm run typecheck`                 | TypeScript в обоих пакетах     |
| `npm test`                          | тесты (Vitest)                 |
| `npm run format` / `format:check`   | Prettier                       |
| `npm run audit:prod`                | npm audit без dev-зависимостей |
| `npm run docker:up` / `docker:down` | docker compose                 |
