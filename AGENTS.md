# Repository Guidelines

## Project Structure & Module Organization
- Frontend app (Vue 3 + TypeScript) at repo root.
- Source: `src/` (components, views, stores, composables, api, utils, assets/styles).
- Public assets: `public/`; build output: `dist/`.
- Tests: `src/**/__tests__/` with `*.spec.ts`.
- Reference docs: `README.md` and `API.md` in the root.

## Build, Test, and Development Commands
- Use Node 20.19+ (or 22.12+). Run from repo root.
- `npm install` – install dependencies.
- `npm run dev` – start Vite at `http://localhost:5173`.
- `npm run build` – type-check and build to `dist/`.
- `npm run preview` – serve the production build locally.
- `npm run test:unit` – run unit tests (Vitest).
- `npm run lint` – lint and auto-fix via ESLint.
- `npm run type-check` – strict checks with `vue-tsc`.

## Coding Style & Naming Conventions
- `.editorconfig`: 2 spaces, LF, max line length 100.
- Vue SFCs use `<script setup>` with Composition API.
- Components: `PascalCase.vue`; composables: `useThing.ts`; stores: `useThingStore.ts`.
- Non-component files/folders: kebab-case; constants: `UPPER_SNAKE_CASE`.

## Testing Guidelines
- Framework: Vitest (jsdom) + Vue Test Utils.
- Location: `src/**/__tests__/`; name tests `*.spec.ts`.
- Mock API calls under `src/api/**`; focus on stores and critical UI logic.

## Commit & Pull Request Guidelines
- Use Conventional Commits (e.g., `feat: add inventory filter`).
- Keep PRs focused; include summary, linked issues, and screenshots/GIFs for UI.
- Ensure build, lint, tests, and type-check pass; note env vars or migrations.

## Security & Configuration Tips
- Do not commit secrets; use `.env.local`.
- Configure API base via `VITE_API_BASE_URL`.
- Review `API.md` before changing or adding endpoints.

