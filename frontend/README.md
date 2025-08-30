# Use-It-Up Frontend

Vue.js Progressive Web Application for the Use-It-Up food waste reduction platform.

## Project Setup

This project is built with:
- **Vue.js 3** with Composition API and TypeScript
- **Vite** for build tooling and development server
- **Pinia** for state management
- **Vue Router** for navigation
- **SCSS** for styling with design tokens
- **Axios** for HTTP requests
- **date-fns** for date manipulation
- **Vitest** for unit testing

## Development

### Prerequisites
- Node.js 20.19.0+ or 22.12.0+
- npm

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Run Tests
```bash
npm run test:unit
```

### Linting
```bash
npm run lint
```

### Type Checking
```bash
npm run type-check
```

## Project Structure

```
src/
├── components/          # Vue components organized by feature
│   ├── inventory/      # Inventory-related components
│   ├── impact/         # Impact display components
│   └── common/         # Shared/common components
├── views/              # Page-level components
├── stores/             # Pinia stores for state management
├── composables/        # Reusable composition functions
├── api/                # API service layer
├── utils/              # Utility functions
└── assets/
    └── styles/         # SCSS files with design tokens
```

## Environment Variables

Create `.env.local` for local development:
```
VITE_API_BASE_URL=http://localhost:3000/api
```

## Design System

The project uses a comprehensive design system with:
- CSS custom properties for colors, spacing, and typography
- Responsive breakpoints for mobile-first design
- Component-based SCSS architecture
- Accessibility-compliant touch targets (44px minimum)

## Key Features

- **Mobile-first responsive design**
- **Touch gesture support** for swipe interactions
- **Real-time expiry status** with color-coded indicators
- **Impact tracking** with environmental and financial metrics
- **Progressive Web App** capabilities
- **TypeScript** for type safety
- **Comprehensive testing** setup

## API Integration

The frontend is designed to work with either:
- AWS Lambda serverless backend
- Traditional EC2-based Node.js/Express server

API endpoints are configured through environment variables for flexible deployment.