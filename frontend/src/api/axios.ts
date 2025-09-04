// HTTP Client Configuration
// Use-It-Up PWA Frontend

import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { config, isDevelopment } from '../config/environment'

// Enhanced error interface
export interface APIError extends Error {
  status?: number
  code?: string
  details?: unknown
}

// Extend Axios config to include metadata
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: {
    requestId: string
  }
}

// Request retry configuration
interface RetryConfig {
  retries: number
  retryDelay: number
  retryCondition?: (error: AxiosError) => boolean
}

// Create axios instance with environment-aware configuration
const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: config.timeout,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// Add request ID for tracking
let requestId = 0
const generateRequestId = () => `req_${Date.now()}_${++requestId}`

// Request interceptor for basic logging only
apiClient.interceptors.request.use(
  (config: ExtendedAxiosRequestConfig) => {
    // Add request ID for tracking
    config.metadata = { requestId: generateRequestId() }

    // Log request in development
    if (isDevelopment()) {
      console.log(`[API Request ${config.metadata?.requestId}]`, {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        params: config.params,
        data: config.data
      })
    }

    return config
  },
  (error) => {
    console.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for error handling and logging
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful response in development
    if (isDevelopment()) {
      console.log(`[API Response ${(response.config as ExtendedAxiosRequestConfig).metadata?.requestId}]`, {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      })
    }

    return response
  },
  async (error: AxiosError) => {
    const requestId = (error.config as ExtendedAxiosRequestConfig)?.metadata?.requestId

    // Enhanced error logging
    if (isDevelopment()) {
      console.error(`[API Error ${requestId}]`, {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        requestData: error.config?.data ? JSON.parse(error.config.data) : null,
        responseData: error.response?.data
      })
      console.error(`[API Error Details ${requestId}]`, {
        fullError: error,
        requestPayload: error.config?.data,
        responseBody: error.response?.data
      })
    }

    // Create simple error object
    const responseData = error.response?.data as { message?: string } | undefined
    const apiError: APIError = new Error(
      responseData?.message ||
      error.message ||
      'Network Error'
    )
    apiError.status = error.response?.status
    apiError.code = error.code
    apiError.details = error.response?.data

    return Promise.reject(apiError)
  }
)

// Retry mechanism for failed requests
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  retryConfig: Partial<RetryConfig> = {}
): Promise<T> {
  const {
    retries = config.retryAttempts,
    retryDelay = config.retryDelay,
    retryCondition = (error: AxiosError) => {
      // Retry on network errors or 5xx server errors
      return !error.response || (error.response.status >= 500 && error.response.status < 600)
    }
  } = retryConfig

  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await requestFn()
    } catch (error) {
      lastError = error

      // Don't retry on last attempt or if retry condition is not met
      if (attempt === retries || !retryCondition(error as AxiosError)) {
        break
      }

      // Calculate delay with exponential backoff
      const delay = retryDelay * Math.pow(2, attempt)

      if (isDevelopment()) {
        console.log(`Retrying request in ${delay}ms (attempt ${attempt + 1}/${retries})`)
      }

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

// Utility function to check if error is retryable
export function isRetryableError(error: AxiosError): boolean {
  return !error.response || (error.response.status >= 500 && error.response.status < 600)
}

// Export configured client and utilities
export default apiClient
export { type AxiosError, type AxiosResponse }
