# Use-It-Up Frontend

Use-It-Up is a progressive web application that helps households track groceries, cut food
waste, and monitor environmental impact. This repository contains the Vue 3 + TypeScript
frontend, powered by Vite and Pinia, with integrations for REST APIs and an optional
Groq-based shopping assistant.

## Tech Stack
- Vue 3 with Composition API and `<script setup>`
- TypeScript with strict `vue-tsc` checks
- Vite for dev server and build tooling
- Pinia for state management and caching
- Vue Router for navigation and route guards
- SCSS design tokens and utility mixins
- Axios HTTP client with retry helpers
- Vitest + Vue Test Utils for unit testing

## Quick Start
1. **Prerequisites:** Node.js 20.19+ (or 22.12+) and npm.
2. **Install dependencies:** `npm install`.
3. **Configure environment:** copy `.env.example` (if present) to `.env.local` and set
   `VITE_API_BASE_URL`. Optional overrides are listed below.
4. **Run the dev server:** `npm run dev` (served at `http://localhost:5173`).
5. **Log in:** obtain a `loginCode` from the backend (see `API.md`) or mock the auth store
   during local development.

## Environment & Configuration
`src/config/environment.ts` merges Vite mode with runtime overrides. Common variables:

| Variable | Description | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | REST API base URL | `/api` in development |
| `VITE_APP_TITLE` | Browser tab title | Mode-dependent |
| `VITE_API_TIMEOUT` | Axios timeout in ms | 10000 (dev) / 15000 (prod) |
| `VITE_RETRY_ATTEMPTS` | Number of HTTP retries | 3 (dev/stage) / 2 (prod) |
| `VITE_RETRY_DELAY` | Base delay in ms for retry backoff | 1000 (dev/stage) / 2000 (prod) |
| `VITE_BACKEND_TYPE` | Backend hint (`lambda` or `ec2`) | varies by mode |
| `VITE_GROQ_ASSISTANT_URL` | Optional Groq lambda endpoint | Hosted default |
| `VITE_HEALTH_CHECK_ENDPOINT` | Health check path | `/health` |

Never commit secrets. Store deploy-specific values in `.env.local`.

## Project Structure
```
src/
├── api/                 # Axios client, REST modules, Groq assistant client
├── assets/
│   └── styles/          # SCSS tokens, mixins, global utilities
├── components/
│   ├── dashboard/       # Dashboard widgets & tours
│   ├── impact/          # Charts, modals, impact cards
│   ├── inventory/       # Item cards, filters, add-item UI
│   ├── assistant/       # AI assistant floating panel
│   ├── home/            # Landing page hero & stats cards
│   └── common/          # Buttons, loaders, layout primitives
├── composables/         # Reusable Composition API helpers
├── stores/              # Pinia stores (auth, inventory, impact, dashboard, groceries)
├── utils/               # Helpers (date, async wrapper, icons, logging)
├── views/               # Page-level components wired via router
└── router/              # Route definitions and guards
```

Supporting folders:
- `public/` – static assets served by Vite.
- `lambda-groq-proxy/` – AWS Lambda handler for the Groq assistant (`README` inside).
- `docs/` – additional diagrams or research artefacts.

## Application Overview
- **Authentication & Households:** Users authenticate with short `loginCode`s obtained
  from the backend. `auth` store persists the session to `localStorage`, loads household
  metadata, and works with `dashboard` store to manage member profiles.
- **Inventory Management:** `inventory` store fetches active items (shared and private),
  caches responses for five minutes, and enriches entries with estimated cost and CO₂ data
  via the groceries catalogue. Components such as `ItemCard` expose use/discard actions
  and accessibility hooks.
- **Impact Analytics:** `impact` store aggregates sustainability metrics and powers
  dashboards like `ImpactCard`, `ImpactTrendModal`, and summaries in
  `DashboardView.vue`. Charts rely on data buckets (`ImpactStatsBucket`,
  `ImpactLedgerRecord`) from the backend.
- **Groq Shopping Assistant:** `DashboardAssistant.vue` calls
  `fetchGroqAssistantSuggestions`, which collects current inventory items and sends them
  to a Groq-backed lambda. Configure the endpoint with `VITE_GROQ_ASSISTANT_URL` or run
  the proxy under `lambda-groq-proxy/`.
- **Tours & UX:** The dashboard tour guides new users through inventory filters,
  sustainability summaries, and the assistant toggle. Maintain ARIA labels and keyboard
  interactions when introducing new UI.

## API Layer
- Shared axios instance (`src/api/axios.ts`) adds request IDs, verbose logging in
  development, and a `retryRequest` helper for transient errors.
- Feature modules (`inventory.ts`, `inventory-rooms.ts`, `impact.ts`, `groq.ts`) wrap
  endpoints with typed inputs/outputs. Update `API.md` whenever contracts change.
- See `src/utils/asyncAction.ts` for a pattern that combines loading/error state with
  async calls; use it when adding new store actions.

## Development Workflow
- Run `npm run dev` for a hot-reloading development server.
- Format/style: rely on the existing SCSS token system; prefer component-scoped styles.
- Linting: `npm run lint` (ESLint with auto-fix).
- Type-safety: `npm run type-check` (vue-tsc + TypeScript project references).
- Testing: `npm run test:unit` (Vitest in jsdom). New features should include or update
  unit tests, especially for Pinia stores and control-heavy components.
- Build output: `npm run build` generates a production bundle in `dist/`. Inspect with
  `npm run preview`.
- Commits follow Conventional Commits (e.g. `feat: add dashboard assistant refresh`).

## Testing Practices
- Tests live in `src/**/__tests__/` and use the `*.spec.ts` suffix.
- For Pinia stores, leverage `setActivePinia` and flush promises. Mock HTTP calls to avoid
  hitting real APIs.
- Component tests should cover interaction flows (filter toggles, assistant refresh,
  impact cards) and accessibility expectations.
- When dealing with timers (inventory cache), use Vitest fake timers to control elapsed
  time.

## UI & Styling Notes
- Adhere to the SCSS design tokens in `src/assets/styles/tokens.scss`. Introduce new
  tokens sparingly and document them.
- Minimum interactive size is 44px. Include keyboard handlers (`@keydown.enter`) when
  adding clickable divs.
- Charts and data visualisations favour high contrast and concise labels for household
  consumption scenarios.

## Deployment
- Build: `npm run build` (runs type-check by default).
- Preview production build locally: `npm run preview`.
- Deploy the `dist/` folder to the chosen hosting provider. Ensure the backend URL and
  assistant lambda are reachable from the deployed environment.

## Troubleshooting
- **Blank dashboard:** confirm `loginCode`, `VITE_API_BASE_URL`, and CORS settings. Inspect
  local storage entries (`useItUp_user`) and the network tab.
- **Stale inventory data:** the store caches results for five minutes. Call
  `inventoryStore.fetchItems(true)` in dev tools or clear `lastFetch`.
- **Assistant errors:** verify the Groq lambda URL, network access, and that inventory
  requests succeed before the lambda call.
- **Slow API calls:** adjust `VITE_API_TIMEOUT`/`VITE_RETRY_*` and monitor logs emitted by
  the axios interceptor in development.

## Useful References
- `API.md` – REST contract, payloads, and authentication flows.
- `AGENTS.md` – condensed agent/operator guidelines.
- `docs/` – additional diagrams, research, and UX references.
- Pinia stores under `src/stores/` for the single source of truth when wiring new UI.
