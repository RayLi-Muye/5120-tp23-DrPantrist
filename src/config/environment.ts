// Environment Configuration
// Use-It-Up PWA Frontend

export interface EnvironmentConfig {
  apiBaseUrl: string
  appTitle: string
  debug: boolean
  timeout: number
  retryAttempts: number
  retryDelay: number
  backendType: 'lambda' | 'ec2'
  healthCheckEndpoint: string
}

export type Environment = 'development' | 'staging' | 'production'

// Environment-specific configurations
const environments: Record<Environment, EnvironmentConfig> = {
  development: {
    apiBaseUrl: '/api',
    appTitle: 'Use-It-Up (Dev)',
    debug: true,
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000,
    backendType: 'ec2',
    healthCheckEndpoint: '/health'
  },
  staging: {
    apiBaseUrl: 'https://api.tp23.me',
    appTitle: 'Use-It-Up (Staging)',
    debug: true,
    timeout: 15000,
    retryAttempts: 3,
    retryDelay: 1000,
    backendType: 'lambda',
    healthCheckEndpoint: '/health'
  },
  production: {
    apiBaseUrl: '/api',
    appTitle: 'Use-It-Up',
    debug: false,
    timeout: 15000,
    retryAttempts: 2,
    retryDelay: 2000,
    backendType: 'lambda',
    healthCheckEndpoint: '/health'
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
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT as string) || config.timeout,
    retryAttempts: parseInt(import.meta.env.VITE_RETRY_ATTEMPTS as string) || config.retryAttempts,
    retryDelay: parseInt(import.meta.env.VITE_RETRY_DELAY as string) || config.retryDelay,
    backendType: (import.meta.env.VITE_BACKEND_TYPE as 'lambda' | 'ec2') || config.backendType,
    healthCheckEndpoint: import.meta.env.VITE_HEALTH_CHECK_ENDPOINT || config.healthCheckEndpoint
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
