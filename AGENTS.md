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

**Клиент** (`client/src`, слои сверху вниз: `app` → `components` → `hooks` → `api` → `config`)

- Компоненты не работают с промисами и `process.env`: запросы в `api/`, жизненный цикл в хуках, env только в `config/env.ts`.
- Хук одного компонента лежит рядом с ним (`components/X/useX.ts`), общий хук — в `src/hooks/`.
- Container / Presentational; маленькие блоки держим в одном `components/X/index.tsx`, не дробим без нужды.
- Без `.then().catch()`: `async/await` + `try/catch`, в эффекте — `void run()`.

**Сервер** (`server/src`)

- Env читается только в `config.ts`; в лог пишем реальный адрес, не зашитый `localhost`.
- Каждый промис ожидаем или помечаем `void`.

**Инструменты**

- Форматирование делает только Prettier, ESLint стилистику не дублирует.
- У каждого модуля свой `.env.example`; корневой нужен только для `docker compose`.

## Команды

- `npm run dev` — server + client
- `npm run lint` / `typecheck` / `test` / `format:check` — проверки перед сдачей этапа
- `npm run build` — production-сборка

## Заметки

- `client/AGENTS.md` создаётся самим Next.js при `next dev` и перезаписывается; свои правила туда не добавляем.
