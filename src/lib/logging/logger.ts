// src/lib/logging/logger.ts
// Structured logging utility for frontend

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, unknown>
  error?: {
    name: string
    message: string
    stack?: string
  }
}

export function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  error?: Error
) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  }

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  // In production, structured JSON for log aggregation
  // In development, formatted for readability
  if (import.meta.env.PROD) {
    console[level](JSON.stringify(entry))
  } else {
    console[level](`[${level.toUpperCase()}] ${message}`, context || '', error || '')
  }
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => log('debug', msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => log('info', msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => log('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>, err?: Error) => log('error', msg, ctx, err),
}
