// Simple environment-aware logger for consistent output
// Use clear method names and readable formatting

import { isDevelopment } from '@/config/environment'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

function formatMessage(level: LogLevel, message: string): string {
  const time = new Date().toISOString()
  return `[${time}] [${level.toUpperCase()}] ${message}`
}

export const logger = {
  debug(message: string, data?: unknown) {
    if (isDevelopment()) {
      // Only print debug logs in development
      // Use console.debug for clear intention
      console.debug(formatMessage('debug', message), data ?? '')
    }
  },
  info(message: string, data?: unknown) {
    console.info(formatMessage('info', message), data ?? '')
  },
  warn(message: string, data?: unknown) {
    console.warn(formatMessage('warn', message), data ?? '')
  },
  error(message: string, data?: unknown) {
    console.error(formatMessage('error', message), data ?? '')
  }
}

