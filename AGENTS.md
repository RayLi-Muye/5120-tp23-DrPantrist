# Repository Guidelines

## Project Structure & Module Organization
- Root docs: `5120-tp23-UseItUp/{API_SPECIFICATION.md,BACKEND_REQUIREMENTS.md}`.
- Frontend app: `5120-tp23-UseItUp/frontend` (Vue 3 + TypeScript).
  - Source: `src/` (components, views, stores, composables, api, utils, assets/styles).
  - Tests: `src/**/__tests__/`.
  - Build output: `dist/`.

## Build, Test, and Development Commands
Run these in `5120-tp23-UseItUp/frontend` with Node 20.19+ (or 22.12+):

- `npm install`: Install dependencies.
- `npm run dev`: Start Vite dev server at `http://localhost:5173`.
- `npm run build`: Type-check and build production assets to `dist/`.
- `npm run preview`: Serve the production build locally.
- `npm run test:unit`: Run unit tests with Vitest.
- `npm run lint`: Lint and auto-fix via ESLint.
- `npm run type-check`: Strict TS checks using `vue-tsc`.

## Coding Style & Naming Conventions
- Indentation 2 spaces, LF EOL, max line length 100 (`.editorconfig`).
- Language: TypeScript; Vue SFCs use Composition API.
- Components: `PascalCase.vue` (e.g., `InventoryList.vue`).
- Composables: `useThing.ts`; stores: `useThingStore.ts` in `src/stores`.
- Non-component files/folders: kebab-case. Constants: `UPPER_SNAKE_CASE`.
- Linting: ESLint (`eslint.config.ts`). Fix issues before committing.

## Testing Guidelines
- Framework: Vitest (jsdom) with Vue Test Utils.
- Location: `src/**/__tests__/`; name tests as `*.spec.ts`.
- Aim for meaningful coverage on critical logic and store actions; mock API calls.
- Run `npm run test:unit` locally and in CI before PRs.

## Commit & Pull Request Guidelines
- Commits: Conventional Commits (e.g., `feat: add inventory filter`). Keep scope small; include tests and lint fixes.
- PRs: provide summary, linked issues, and screenshots/GIFs for UI changes.
- Checklist: build passes, tests added/updated, no secrets in diffs, env notes included.

## Security & Configuration Tips
- Never commit secrets. Use `.env.local`; sample keys live in `.env.*` files.
- Configure API base via `VITE_API_BASE_URL` (see frontend README).
- Review `API_SPECIFICATION.md` before integrating or changing endpoints.

