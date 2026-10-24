# AGENTS.md

Monorepo for the Dzencode test task: `client/` (Next.js 16, React 19, TypeScript) and `server/` (Express 5, TypeScript). See [README.md](README.md) for details.

**Read the full rule set before you start: [docs/CODING_RULES.md](docs/CODING_RULES.md).** The stage plan is in [docs/PLAN.md](docs/PLAN.md).

## The essentials

**Process**

- Work in stages: discuss the details of a stage first, then implement it on a `stage/N-name` branch.
- Do not commit or merge into `main` without the project owner's explicit OK.
- Do not say "it works" without checking; name what is unverified. Stop the processes you started.

**Language**

- Everything in the repository is in English: identifiers, comments, file names, logs, documentation, commit messages.
- UI texts in components (and the content of mock or seed data) may stay in Russian until i18n arrives in stage 6.
- Talk to the project owner in Russian.

**Client** (`client/src`, feature structure, layers from top to bottom: `app` → `features/<name>` → `shared`)

- A feature is `features/<name>/{components,hooks,api,store}` plus an `index.ts` as its public interface; reach another feature only through `@/features/<name>`, use relative paths inside a feature.
- Components do not handle promises or `process.env`: requests live in `api/`, lifecycle in hooks, env only in `shared/config/env.ts`.
- A hook used by one component sits next to it (`components/X/useX.ts`), a hook shared by components of one feature goes to `features/<name>/hooks/`, a hook shared by features goes to `shared/hooks/`.
- Container / Presentational; keep small blocks in a single `components/X/index.tsx`, do not split without need.
- Styles: Bootstrap 5 from SCSS plus a BEM block in `X.scss` next to the component; colors and sizes only from `shared/styles/_tokens.scss`.
- Page animations: React `<ViewTransition>` (`PageTransition` inside `page.tsx`), classes in `shared/styles/_transitions.scss`; a section without a page is a `ComingSoon` page, not an ErrorBoundary.
- Format dates and money with the functions from `shared/lib` (not `Intl`), so hydration does not break.
- No `.then().catch()`: use `async/await` with `try/catch`, and `void run()` inside an effect.

**Server** (`server/src`)

- Env is read only in `config.ts`; log the real bound address, never a hard-coded `localhost`.
- Await every promise or mark it with `void`.
- Feature modules `modules/<name>/` (`*.routes.ts` → `*.service.ts` → `*.repository.ts`), wired in `app.ts`; services throw domain errors, only `shared/http/errorHandler.ts` sets HTTP statuses; reach a neighbouring module only through its `index.ts`.
- The DB schema changes only through a new Liquibase changeSet (`db/changelog`); SQL is written only in `*.repository.ts`, values only through `?`.

**Tooling**

- Prettier does all formatting; ESLint does not duplicate style rules.
- Every package has its own `.env.example`; the root one is only for `docker compose`.

## Commands

- `npm run dev`: server and client
- `npm run lint` / `typecheck` / `test` / `format:check`: checks before a stage is handed over
- `npm run build`: production build

## Notes

- `client/AGENTS.md` is created by Next.js itself on `next dev` and gets overwritten; do not add your own rules there.
