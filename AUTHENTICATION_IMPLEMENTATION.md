# Authentication Implementation

## Overview

This document describes the simple authentication system implemented for the UseItUp PWA. The system allows users to create their own inventory with a unique login code for access.

## Features

### 1. Simple User Registration
- Users can create a new inventory by providing an inventory name
- System generates a unique 6-digit login code
- No complex registration process required

### 2. Code-Based Authentication
- Users access their inventory using the 6-digit login code
- Codes are stored locally in localStorage
- No server-side authentication required for MVP

### 3. Impact Statistics
- Added impact statistics display on inventory page
- Shows money saved and CO₂ reduced
- Simple, intuitive visualization of user's environmental impact

## Implementation Details

### Auth Store (`src/stores/auth.ts`)
- Manages user authentication state
- Handles inventory creation and login
- Persists user data in localStorage
- Generates unique user IDs and login codes

### Components

#### AuthView (`src/views/AuthView.vue`)
- Login/registration interface
- Toggle between create inventory and login modes
- Displays generated login code to new users
- Form validation and error handling

#### ImpactStats (`src/components/inventory/ImpactStats.vue`)
- Displays user's environmental impact statistics
- Shows money saved and CO₂ reduced
- Integrates with existing impact store
- Responsive design for mobile devices

### Router Updates
- Added authentication guards
- Redirects unauthenticated users to auth page
- Prevents authenticated users from accessing auth page

## User Flow

### New User
1. User opens the app
2. Redirected to authentication page
3. Enters inventory name (e.g., "My Kitchen")
4. System generates 6-digit login code
5. User saves the code for future access
6. Redirected to dashboard

### Returning User
1. User opens the app
2. If not logged in, redirected to authentication page
3. Enters 6-digit login code
4. Redirected to dashboard with their inventory

## Data Storage

### localStorage Structure
```json
{
  "useItUp_user": {
    "id": "user_1693123456789_abc123def",
    "inventoryName": "My Kitchen",
    "loginCode": "123456",
    "createdAt": "2024-08-30T12:34:56.789Z"
  }
}
```

## Security Considerations

### Current Implementation
- Codes are stored in localStorage (client-side only)
- 6-digit codes provide basic security for personal use
- No server-side validation in current MVP

### Future Enhancements
- Server-side code validation
- Code expiration
- Rate limiting for login attempts
- Optional password protection

## Testing

### Auth Store Tests
- User creation with valid inventory names
- Login with valid/invalid codes
- Logout functionality
- localStorage persistence

### Component Tests
- ImpactStats rendering with mock data
- Loading and error states
- User interaction handling

## Mobile Considerations

### Responsive Design
- Touch-friendly interface elements
- Optimized for various screen sizes
- Proper keyboard handling for code input

### PWA Features
- Works offline after initial load
- Installable on mobile devices
- Fast loading with cached assets

## Usage Examples

### Creating New Inventory
```typescript
const authStore = useAuthStore()
const user = authStore.createInventory('Family Kitchen')
console.log(`Your login code is: ${user.loginCode}`)
```

### Logging In
```typescript
const authStore = useAuthStore()
const success = authStore.loginWithCode('123456')
if (success) {
  // User is now authenticated
}
```

### Checking Authentication
```typescript
const authStore = useAuthStore()
if (authStore.isAuthenticated) {
  // User is logged in
  console.log(`Welcome ${authStore.user.inventoryName}`)
}
```

## Impact Statistics

### Display Format
- Money saved: Currency format (e.g., "$25.50")
- CO₂ reduced: Weight format (e.g., "2.3 kg")
- Comparison: Relatable equivalents (e.g., "5 miles of driving")

### Data Sources
- Integrates with existing impact store
- Real-time updates when items are used
- Persistent across sessions

## Future Roadmap

### Phase 2 Enhancements
- Server-side authentication
- Multi-device synchronization
- Shared inventories for families
- Advanced impact analytics

### Phase 3 Features
- Social features (sharing achievements)
- Gamification elements
- Integration with grocery stores
- Barcode scanning for easy item addition