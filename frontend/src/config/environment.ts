// Environment Configuration
// Use-It-Up PWA Frontend

export interface EnvironmentConfig {
  apiBaseUrl: string
  appTitle: string
  debug: boolean
  timeout: number
  retryAttempts: number
  retryDelay: number
}

export type Environment = 'development' | 'staging' | 'production'

// Environment-specific configurations
const environments: Record<Environment, EnvironmentConfig> = {
  development: {
    apiBaseUrl: 'http://localhost:3000/api',
    appTitle: 'Use-It-Up (Dev)',
    debug: true,
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  staging: {
    apiBaseUrl: 'https://staging-api.useitup.com/v1',
    appTitle: 'Use-It-Up (Staging)',
    debug: true,
    timeout: 15000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  production: {
    apiBaseUrl: 'https://api.useitup.com/v1',
    appTitle: 'Use-It-Up',
    debug: false,
    timeout: 15000,
    retryAttempts: 2,
    retryDelay: 2000
  }
}

// Detect current environment
function getCurrentEnvironment(): Environment {
  const mode = import.meta.env.MODE as Environment

  // Fallback logic for environment detection
  if (mode && environments[mode]) {
    return mode
  }

  // Default to development if environment is not recognized
  return 'development'
}

// Get configuration for current environment
export function getEnvironmentConfig(): EnvironmentConfig {
  const env = getCurrentEnvironment()
  const config = environments[env]

  // Override with environment variables if available
  return {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || config.apiBaseUrl,
    appTitle: import.meta.env.VITE_APP_TITLE || config.appTitle,
    debug: import.meta.env.VITE_DEBUG === 'true' || config.debug,
    timeout: config.timeout,
    retryAttempts: config.retryAttempts,
    retryDelay: config.retryDelay
  }
}

// Export current environment and config
export const currentEnvironment = getCurrentEnvironment()
export const config = getEnvironmentConfig()

// Utility functions
export function isDevelopment(): boolean {
  return currentEnvironment === 'development'
}

export function isProduction(): boolean {
  return currentEnvironment === 'production'
}

export function isStaging(): boolean {
  return currentEnvironment === 'staging'
}
