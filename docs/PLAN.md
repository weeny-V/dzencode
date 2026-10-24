# План этапов

Каждый этап живёт в своей ветке `stage/N-name` от `main`. Перед этапом мы обсуждаем его детали; в `main` ветка вливается (`--no-ff`) только после явного ОК.

| #   | Ветка                     | Содержание                                                                                                                          |
| --- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 0   | `stage/0-scaffold`        | Монорепо `client/` + `server/`, Next.js 16 + TypeScript, Express + TypeScript, ESLint + Prettier, Docker, README, материалы задания |
| 1   | `stage/1-database`        | MySQL в Docker, Liquibase (миграции + сид из `app.js`), `.mwb` для Workbench, REST API, интеграционные тесты                        |
| 1b  | `stage/1b-docs-site`      | Документация на VitePress: `docs/` как отдельный workspace, скрипты `docs:dev` / `docs:build`, сайдбар, схема БД и описание API     |
| 2   | `stage/2-layout`          | Bootstrap + SCSS по БЭМ, layout по скринам, NavigationMenu, TopMenu с часами, роутинг, анимации переходов                           |
| 3   | `stage/3-orders-products` | Redux, Fetch к реальному API, страницы Orders и Products, фильтр по типу                                                            |
| 4   | `stage/4-realtime`        | Socket.io, счётчик активных сессий                                                                                                  |
| 5   | `stage/5-forms`           | Попап удаления, формы добавления прихода и продукта с валидацией                                                                    |
| 6   | `stage/6-junior-plus`     | SSR-предзагрузка, i18n, JWT, Web Storage, Lazy Loading, Charts, Maps, unit-тесты                                                    |
| 7   | `stage/7-middle`          | GraphQL, Web Workers, PWA, EDA, оптимизация, npm scripts, интеграционные и e2e-тесты, Graph                                         |
| 8   | `stage/8-deploy`          | Деплой, самопроверка запуска с нуля по README, чек-лист для тестировщика                                                            |

В рамках этапа 0 согласован набор правил ESLint (промисы с type-aware проверкой на клиенте и сервере, порядок и типизация импортов через `simple-import-sort`, границы слоёв клиента, страховочные правила). Подробности в [CODING_RULES.md](CODING_RULES.md#eslint-правила). Новые правила по ходу этапов добавляем туда же и в конфиги.

Архитектура клиента (согласована): feature-структура `app/` → `features/<name>/{components,hooks,api,store}` → `shared/`, фичи общаются только через `index.ts` (подробности в [CODING_RULES.md](CODING_RULES.md#архитектура-клиента-clientsrc)).

Архитектура сервера (согласована): feature-модули `modules/<name>` со слоями routes → service → repository, доменные ошибки вместо HTTP-ошибок в сервисах, зависимости собираются фабриками в `app.ts`, имена файлов вида `orders.service.ts` (подробности в [CODING_RULES.md](CODING_RULES.md#сервер-serversrc)).

Решения этапа 1 (согласованы): changelog Liquibase в YAML; доступ к БД через `mysql2` с SQL вручную, без ORM; цены в отдельной таблице `product_prices`, типы в `product_types`; `ON DELETE CASCADE` для продуктов и цен при удалении прихода; REST включает `POST /orders` и `POST /products` (валидация вручную, на этапе 5 может смениться библиотекой); интеграционные тесты на отдельной БД `dzencode_test`; файл `.mwb` Workbench создаётся reverse engineering из живой базы (шаги в README), в репозитории лежит дамп `docs/db/schema.sql`.
