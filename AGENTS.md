# Repository Guidelines

## Project Structure & Module Organization
- Vue source lives in `src/` with feature folders (`components`, `views`, `stores`, `api`, `composables`, `utils`).
- Styles sit in `src/assets/styles/`; other media stay under `src/assets/**`; Vite serves static files from `public/`.
- Tests colocate beside code in `src/**/__tests__/` and reuse the filename with `.spec.ts`.
- Reference docs: `API_SPECIFICATION.md`, `BACKEND_REQUIREMENTS.md`; historical context in `archive/`.
- Builds output to `dist/`; `.env.*` templates live at the root while secrets remain in `.env.local`.

## Build, Test, and Development Commands
- Use Node 20.19+ and run commands from the repo root.
- `npm install` — install dependencies locked in `package-lock.json`.
- `npm run dev` — launch Vite on `http://localhost:5173` with hot reload.
- `npm run build` — type-check and emit production bundles to `dist/`.
- `npm run preview` — serve the build locally for smoke tests.
- `npm run lint` — apply ESLint rules; append `--fix` for autofixes.
- `npm run type-check` — run strict `vue-tsc` validation.
- `npm run test:unit` — execute Vitest; add `--watch` when iterating.

## Coding Style & Naming Conventions
- Obey `.editorconfig`: 2-space indent, LF endings, 100-character lines.
- Author Vue SFCs with `<script setup>` and the Composition API in TypeScript.
- Name components `PascalCase.vue`, composables `useThing.ts`, stores `useThingStore.ts`.
- Prefer kebab-case elsewhere and reserve `UPPER_SNAKE_CASE` for constants; fix lint warnings instead of disabling rules.

## Testing Guidelines
- Primary stack: Vitest with Vue Test Utils in jsdom.
- Keep specs in `src/**/__tests__/` using the `*.spec.ts` suffix.
- Mock `src/api/**` calls for deterministic runs and cover store actions, routing guards, and error handling.
- Run `npm run test:unit` before commits and pushes to protect inventory, auth, and dashboard flows.

## Commit & Pull Request Guidelines
- Use Conventional Commits (e.g., `feat: add inventory filter`) and keep each change focused.
- Rebase feature branches prior to opening a PR to avoid merge noise.
- Provide PR summaries, linked issues, validation notes, and UI captures when visuals shift.
- Confirm build, lint, type-check, and tests pass; document environment or migration steps if needed.

## Security & Configuration Tips
- Configure API hosts through `VITE_API_BASE_URL`; avoid hardcoded URLs.
- Store secrets solely in `.env.local` and rotate credentials immediately if exposed.
- Review `API_SPECIFICATION.md` and `docs/epic4-backend-api-proposal.md` before modifying backend integrations.
