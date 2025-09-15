# Repository Guidelines

## Project Structure & Module Organization
- Root docs: `5120-tp23-UseItUp/{API_SPECIFICATION.md,BACKEND_REQUIREMENTS.md}`.
- Frontend (Vue 3 + TypeScript): `frontend/`.
- Source: `src/` (components, views, stores, composables, api, utils, assets/styles).
- Tests: `src/**/__tests__/`.
- Build output: `dist/`.

## Build, Test, and Development Commands
Run in `frontend` with Node 20.19+ (or 22.12+).
- `npm install`: Install dependencies.
- `npm run dev`: Start Vite at `http://localhost:5173`.
- `npm run build`: Type-check and build to `dist/`.
- `npm run preview`: Serve the production build.
- `npm run test:unit`: Run Vitest unit tests.
- `npm run lint`: Lint and auto-fix via ESLint.
- `npm run type-check`: Strict TS checks with `vue-tsc`.

## Coding Style & Naming Conventions
- Indentation 2 spaces, LF EOL, max line length 100.
- Use Composition API in `.vue` SFCs; TypeScript everywhere.
- Components: `PascalCase.vue` (e.g., `InventoryList.vue`).
- Composables: `useThing.ts`; stores: `useThingStore.ts` in `src/stores`.
- Non-component files/folders: kebab-case. Constants: `UPPER_SNAKE_CASE`.
- Linting: `eslint.config.ts`; fix all warnings/errors before commit.

## Testing Guidelines
- Framework: Vitest (jsdom) + Vue Test Utils.
- Tests live under `src/**/__tests__/` and end with `.spec.ts`.
- Focus on critical logic and store actions; mock API calls.
- Run `npm run test:unit` locally and in CI before PRs.

## Commit & Pull Request Guidelines
- Conventional Commits (e.g., `feat: add inventory filter`).
- Keep changes scoped; include tests and lint fixes.
- PRs: clear summary, linked issues, and UI screenshots/GIFs when applicable.
- Ensure: build passes, tests updated, no secrets, env notes included.

## Security & Configuration Tips
- Never commit secrets. Use `.env.local`; see examples in `.env.*`.
- Configure API base via `VITE_API_BASE_URL` (see frontend README).
- Review `API_SPECIFICATION.md` before integrating or changing endpoints.

