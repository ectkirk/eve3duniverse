type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const currentLevel: LogLevel = 'debug'

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel]
}

function formatArgs(module: string, args: unknown[]): unknown[] {
  const timestamp = new Date().toISOString().split('T')[1]?.slice(0, 12) ?? ''
  return [`[${timestamp}][${module}]`, ...args]
}

export function createLogger(module: string) {
  return {
    debug: (...args: unknown[]) => {
      if (shouldLog('debug')) console.log(...formatArgs(module, args))
    },
    info: (...args: unknown[]) => {
      if (shouldLog('info')) console.info(...formatArgs(module, args))
    },
    warn: (...args: unknown[]) => {
      if (shouldLog('warn')) console.warn(...formatArgs(module, args))
    },
    error: (...args: unknown[]) => {
      if (shouldLog('error')) console.error(...formatArgs(module, args))
    },
  }
}
