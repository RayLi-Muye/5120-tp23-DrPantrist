# Agent Onboarding Guide

This repository contains the **Use-It-Up** progressive web app: a Vue 3 + TypeScript
frontend that helps households track groceries, reduce waste, and surface sustainability
insights. The backend is accessed through REST endpoints (see `API.md`) and an optional
Groq-powered assistant.

## Quick Facts
- Runtime: Node.js 20.19+ (or 22.12+) with npm.
- Framework: Vue 3, Vite, Pinia, Vue Router, SCSS modules, Chart.js/ECharts via feature
  components.
- Testing: Vitest + Vue Test Utils under `src/**/__tests__`.
- Primary commands: `npm run dev`, `npm run build`, `npm run test:unit`, `npm run lint`,
  `npm run type-check`.
- Key docs: `README.md` (developer onboarding) and `API.md` (HTTP contracts).

## Repository Map
- `src/views/` – top level pages (Home, Dashboard, Add Item, Auth). Each view wires
  together feature modules and handles routing guards or data bootstrapping.
- `src/components/` – feature folders (`inventory`, `impact`, `dashboard`, `assistant`,
  `home`, `common`). Components use `<script setup>` and Composition API.
- `src/stores/` – Pinia stores for auth, inventory, groceries, dashboard meta, and impact
  analytics. Stores centralise API calls, caching, and derived state.
- `src/api/` – axios client configuration plus feature-specific service modules
  (`inventory`, `inventory-rooms`, `impact`, `groq`). All HTTP interactions are funneled
  through this layer.
- `src/composables/` and `src/utils/` – reusable logic (expiry status helpers,
  async loaders, logging, design tokens).
- `lambda-groq-proxy/` – AWS Lambda bridge for Groq chat completions (deploy docs inside).

## State & Data Flow
- Authentication is code-based. `auth` store persists the logged-in user to
  `localStorage` and loads household profiles via `dashboard` store.
- `inventory` store handles item fetching, caching (5 minute TTL via `lastFetch`), local
  shared/private visibility overrides, freshness calculations, and sustainability
  enrichment (cost/CO₂ estimates).
- `impact` store aggregates ledger stats and powers charts and the trend modal.
- UI components consume store getters via `computed` props and react to loading/error
  booleans surfaced by `runWithLoadingAndError` helper.

## HTTP & Environment Configuration
- Shared axios instance (`src/api/axios.ts`) adds request IDs, development logging, and a
  retry helper (`retryRequest`) for transient failures. Handle all API errors by catching
  `APIError`.
- `src/config/environment.ts` merges the current Vite mode with runtime overrides from
  env vars. Critical variables:
  - `VITE_API_BASE_URL` – REST base URL (default `/api` for dev).
  - `VITE_GROQ_ASSISTANT_URL` – optional override for Groq lambda endpoint.
  - `VITE_APP_TITLE`, `VITE_API_TIMEOUT`, `VITE_RETRY_*`, `VITE_BACKEND_TYPE` for fine
    tuning.
- When adding endpoints, update `API.md` and prefer extending the corresponding service
  module instead of calling axios directly from components.

## UI & Styling Guidelines
- Styling relies on SCSS tokens under `src/assets/styles`. Prefer variables, mixins, and
  existing utility classes before introducing new globals.
- Component structure:
  - `<template>` + `<script setup lang="ts">` + `<style scoped>`.
  - Keep logic in stores/composables; components orchestrate UI interactions.
- Accessibility: maintain ARIA labels as seen in dashboard controls, ensure keyboard
  handlers for interactive elements, and preserve touch targets ≥44px.

## Development Workflow
1. Install dependencies: `npm install`.
2. Copy `.env.example` to `.env.local` (if present) and set required values. Minimum:
   `VITE_API_BASE_URL`. Add `VITE_GROQ_ASSISTANT_URL` when pointing to a custom lambda.
3. Run `npm run dev` for the Vite server at `http://localhost:5173`.
4. Run `npm run lint`, `npm run type-check`, and `npm run test:unit` before submitting PRs.
5. Use Conventional Commits and keep changes scoped; UI tweaks should include before/after
   notes or screenshots.

## Testing Expectations
- Place specs in `src/**/__tests__` with the `.spec.ts` suffix.
- Prefer unit-testing Pinia stores and critical components (inventory filters, impact
  summaries, assistant toggles). Mock HTTP via MSW or manual spies; do not hit live APIs.
- Dashboard flows that rely on timers/caching should assert with fake timers and mock
  stores.

## Gotchas & Tips
- Many views expect a logged-in user with a valid `loginCode`. For local testing without a
  backend, stub auth responses or load fixtures via the stores.
- Inventory items may include sustainability overrides from the API or local storage; be
  mindful when mutating `visibilityOverrides`.
- Groq assistant fetches the current inventory before sending prompts. Mock
  `fetchGroqAssistantSuggestions` or stub inventory calls when testing.
- Chart-heavy components (impact trend modal, dashboards) lazy-load options; ensure data
  structures stay backward compatible.

For more context, review `README.md` for developer onboarding, and `API.md` for endpoint
contracts. Update both when introducing new features or API calls.
