/**
 * Minimal structured logger.
 *
 * Writes JSON lines to stdout/stderr so any log aggregator (Datadog,
 * CloudWatch, Loki, …) can parse them without extra configuration.
 *
 * Usage:
 *   import { logger } from '@utils/logger'
 *   logger.info('server started', { port: 3001 })
 *   logger.error('unhandled error', { err, correlationId: req.id })
 */

type Level = 'debug' | 'info' | 'warn' | 'error'
type Meta = Record<string, unknown>

const LEVEL_NUM: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
}

// In production prefer 'info'; locally 'debug' is useful.
const MIN_LEVEL: number =
  LEVEL_NUM[(process.env.LOG_LEVEL as Level | undefined) ?? 'info'] ??
  LEVEL_NUM.info

function log(level: Level, message: string, meta?: Meta): void {
  if (LEVEL_NUM[level] < MIN_LEVEL) return

  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...meta
  }

  // Serialize Error objects into something useful
  if (entry.err instanceof Error) {
    const { message: errMsg, name, stack } = entry.err as Error
    entry.err = { name, message: errMsg, stack }
  }

  const line = JSON.stringify(entry)
  if (level === 'error' || level === 'warn') {
    process.stderr.write(line + '\n')
  } else {
    process.stdout.write(line + '\n')
  }
}

export const logger = {
  debug: (message: string, meta?: Meta) => log('debug', message, meta),
  info: (message: string, meta?: Meta) => log('info', message, meta),
  warn: (message: string, meta?: Meta) => log('warn', message, meta),
  error: (message: string, meta?: Meta) => log('error', message, meta)
}
