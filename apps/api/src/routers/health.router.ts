import { Router, Request, Response } from 'express'
import { redis, prisma } from '@/lib'

const healthRouter = Router()

const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms
      )
    )
  ])

healthRouter.get('/health', async (req: Request, res: Response) => {
  const [postgresStatus, redisStatus] = await Promise.all([
    withTimeout(prisma.$queryRaw`SELECT 1`, 3000, 'Postgres')
      .then(() => ({ status: 'connected' as const, error: null }))
      .catch((err: Error) => {
        console.error(
          new Date().toISOString(),
          'Postgres Client Error:',
          err.message
        )
        return { status: 'disconnected' as const, error: err.message }
      }),

    // Short-circuit immediately if the client isn't even connected
    !redis.isReady
      ? Promise.resolve({
          status: 'disconnected' as const,
          error: 'Redis client is not connected'
        })
      : withTimeout(redis.ping(), 3000, 'Redis')
          .then(() => ({ status: 'connected' as const, error: null }))
          .catch((err: Error) => {
            console.error(
              new Date().toISOString(),
              'Redis Client Error:',
              err.message
            )
            return { status: 'disconnected' as const, error: err.message }
          })
  ])

  const healthy =
    postgresStatus.status === 'connected' && redisStatus.status === 'connected'

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    databases: {
      postgres: postgresStatus,
      redis: redisStatus
    }
  })
})

export { healthRouter }
