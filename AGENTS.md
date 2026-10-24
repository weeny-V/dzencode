# AGENTS.md

Монорепо Dzencode test task: `client/` (Next.js 16, React 19, TypeScript) и `server/` (Express 5, TypeScript). Подробности — в [README.md](README.md).

**Перед работой прочитай полный свод правил: [docs/CODING_RULES.md](docs/CODING_RULES.md).** План этапов — [docs/PLAN.md](docs/PLAN.md).

## Главное (краткая выжимка)

**Процесс**

- Работаем по этапам; перед этапом обсуждаем детали, затем реализуем в ветке `stage/N-name`.
- Не коммитим и не вливаем в `main` без явного ОК владельца проекта.
- Не пишем «работает» без проверки; непроверенное называем явно. Запущенные процессы останавливаем.

**Язык**

- Код целиком на английском (идентификаторы, комментарии, имена файлов, логи). Тексты UI в компонентах пока могут быть русскими.
- Документацию и ответы ведём на русском.

**Клиент** (`client/src`, feature-структура, слои сверху вниз: `app` → `features/<name>` → `shared`)

- Фича: `features/<name>/{components,hooks,api,store}` + `index.ts` как публичный интерфейс; к другой фиче только через `@/features/<name>`, внутри фичи относительные пути.
- Компоненты не работают с промисами и `process.env`: запросы в `api/`, жизненный цикл в хуках, env только в `shared/config/env.ts`.
- Хук одного компонента лежит рядом с ним (`components/X/useX.ts`), хук нескольких компонентов фичи — в `features/<name>/hooks/`, общий для фич — в `shared/hooks/`.
- Container / Presentational; маленькие блоки держим в одном `components/X/index.tsx`, не дробим без нужды.
- Без `.then().catch()`: `async/await` + `try/catch`, в эффекте — `void run()`.

**Сервер** (`server/src`)

- Env читается только в `config.ts`; в лог пишем реальный адрес, не зашитый `localhost`.
- Каждый промис ожидаем или помечаем `void`.
- Feature-модули `modules/<name>/` (`*.routes.ts` → `*.service.ts` → `*.repository.ts`), сборка в `app.ts`; сервис бросает доменные ошибки, статусы HTTP ставит только `shared/http/errorHandler.ts`; к соседнему модулю только через его `index.ts`.
- Схема БД меняется только новым changeSet'ом Liquibase (`db/changelog`); SQL пишем только в `*.repository.ts`, значения только через `?`.

**Инструменты**

- Форматирование делает только Prettier, ESLint стилистику не дублирует.
- У каждого модуля свой `.env.example`; корневой нужен только для `docker compose`.

## Команды

- `npm run dev` — server + client
- `npm run lint` / `typecheck` / `test` / `format:check` — проверки перед сдачей этапа
- `npm run build` — production-сборка

## Заметки

- `client/AGENTS.md` создаётся самим Next.js при `next dev` и перезаписывается; свои правила туда не добавляем.
