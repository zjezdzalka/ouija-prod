import 'dotenv/config'

import { createServer } from 'http'
import { app } from '@/app'
import { attachWebSocketServer } from '@/lib/ws'
import { logger } from '@utils/logger'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

const PORT = process.env.PORT ?? 3001

async function start() {
  // ── Fail fast if backing services are unreachable ──────────────────────────
  try {
    await prisma.$queryRaw`SELECT 1`
    logger.info('postgres connection verified')
  } catch (err) {
    logger.error('postgres unreachable — aborting startup', { err })
    process.exit(1)
  }

  try {
    await redis.ping()
    logger.info('redis connection verified')
  } catch (err) {
    // Redis is used for sessions and caching but the app can degrade gracefully
    // once running; however we want to know about it at boot.
    logger.warn('redis ping failed at startup — sessions may not work', { err })
  }

  // ── Start HTTP + WebSocket server ──────────────────────────────────────────
  const httpServer = createServer(app)
  attachWebSocketServer(httpServer)

  httpServer.listen(PORT, () => {
    logger.info('api server started', {
      port: PORT,
      http: `http://localhost:${PORT}`,
      ws: `ws://localhost:${PORT}/ws`
    })
  })
}

start()
