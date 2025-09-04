# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm run dev` - Start development server with Vite (includes API proxy)
- `npm run build` - Build for production
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Lint and auto-fix code issues
- `npm run test:unit` - Run unit tests with Vitest

### Testing Commands
- `npm run test:unit -- --run` - Run tests without watch mode
- `npm run test:unit -- --run src/stores/__tests__/auth.test.ts` - Run specific test file

## Architecture Overview

### Tech Stack
- **Vue 3** with Composition API and TypeScript
- **Vite** for build tooling with development proxy
- **Pinia** for state management (stores)
- **Vue Router** with navigation guards
- **SCSS** with design tokens and CSS custom properties
- **Vitest** for unit testing

### Core Architecture Patterns

#### State Management (Pinia Stores)
- `stores/auth.ts` - Authentication with login_code system
- `stores/inventory.ts` - Inventory items with caching and optimistic updates
- `stores/groceries.ts` - Grocery catalog and search
- `stores/impact.ts` - Environmental impact calculations

#### API Layer
- `api/inventory.ts` - Main inventory CRUD operations with dual API support
- `api/inventory-rooms.ts` - User and room management with login_code authentication
- `api/axios.ts` - HTTP client with retry logic

#### Component Organization
```
components/
├── common/           # Reusable UI components
├── inventory/        # Inventory-specific components with swipe gestures
├── impact/          # Environmental impact display
└── dashboard/       # Dashboard widgets
```

### Key Design Patterns

#### API Integration
The app connects directly to the real backend API at http://13.210.101.133:8000.

All API methods include comprehensive error handling and retry logic.

#### Login Code Authentication
Uses 6-digit login codes instead of traditional auth:
- Users create accounts → get login_code
- Authentication via `login_code` parameter in API calls
- Supports both user creation and joining existing inventories

#### Mobile-First Touch Interactions
- Swipe gestures for item actions (mark as used)
- Touch-friendly targets (44px minimum)
- Progressive enhancement for mobile features

## Critical Implementation Details

### API Proxy Configuration
Development server proxies `/api/*` to `http://13.210.101.133:8000` to avoid CORS issues:
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://13.210.101.133:8000',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
      secure: false
    }
  }
}
```

### Environment-Aware API URLs
API services detect environment and use appropriate base URLs:
```typescript
private baseUrl = import.meta.env.DEV ? '/api' : 'http://13.210.101.133:8000'
```

### Optimistic UI Updates
Inventory operations (add/delete/mark as used) update local state immediately, then revert on API failure:
- Store item reference before API call
- Update UI optimistically
- Rollback on error with stored reference

### Design System
Uses CSS custom properties for consistent theming:
- Color system based on freshness status (fresh/warning/expired)
- Responsive breakpoints (mobile-first)
- Touch-accessible sizing with `--touch-target-min: 44px`

## Common Development Workflows

### Adding New API Endpoints
1. Add interface definitions to appropriate API file
2. Implement method with retry logic and error handling
3. Add fallback to mock API if needed
4. Update corresponding Pinia store
5. Add error states to UI components

### Adding New Components
1. Follow existing patterns in `components/` structure
2. Use Composition API with TypeScript
3. Implement responsive design with existing breakpoints
4. Add proper accessibility attributes
5. Include unit tests if business logic is complex

### Working with Authentication
- All protected routes require `isAuthenticated` check
- Use `authStore.user.value?.loginCode` for API calls
- Handle authentication failures with redirect to `/auth`
- Auto-login attempts on app startup via `tryAutoLogin()`

## Key Files to Understand

### Core Configuration
- `vite.config.ts` - Build config with API proxy
- `src/main.ts` - App initialization and Pinia setup
- `src/router/index.ts` - Route definitions with auth guards

### Critical Components
- `src/App.vue` - Root component with auto-login logic
- `src/components/inventory/InventoryItem.vue` - Complex swipe interactions
- `src/views/DashboardView.vue` - Main inventory management interface

### API Integration
- `src/api/inventory.ts` - Contains inventory CRUD with login_code support
- `src/stores/inventory.ts` - Inventory state management with caching (5min duration)

## Testing Strategy

### Unit Tests
- Store logic testing (auth, inventory operations)
- Component testing for complex interactions
- API integration testing with mocked responses

### Key Test Patterns
```typescript
// Store testing pattern
const authStore = useAuthStore()
await authStore.createInventory('Test Kitchen', 'User')
expect(authStore.isAuthenticated).toBe(true)
```

## Environment Variables

### Development
- Uses Vite proxy for API calls
- Enables Vue DevTools
- API base: `/api` (proxied)

### Production
- Direct API calls to `http://13.210.101.133:8000`
- Optimized builds with code splitting
- PWA capabilities enabled

## Common Issues and Solutions

### CORS Errors in Development
Ensure Vite dev server is running - proxy configuration handles CORS automatically.

### Authentication Flow Issues
Check localStorage for `useItUp_user` and `login_code` entries. Clear them to reset auth state.

### TypeScript Errors
Run `npm run type-check` to identify type issues. Common areas:
- API response interfaces
- Store reactive references
- Component prop types

### API Integration Issues
The app requires a working backend API connection. If the API is unavailable:
1. Check network connectivity
2. Verify the backend server is running
3. Confirm proxy configuration in development
4. Check browser console for specific API error messages