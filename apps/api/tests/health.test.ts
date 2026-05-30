import request from 'supertest'
import { app } from '@/app'
import { prisma } from '@/lib'
import { redis } from '@/lib'

const prismaMock = prisma as jest.Mocked<typeof prisma>
const redisMock = redis as jest.Mocked<typeof redis>

describe('GET /api/health', () => {
  it('returns 200 healthy when both services are up', async () => {
    ;(prismaMock.$queryRaw as jest.Mock).mockResolvedValueOnce([1])
    ;(redisMock.ping as jest.Mock).mockResolvedValueOnce('PONG')
    Object.defineProperty(redisMock, 'isReady', {
      get: () => true,
      configurable: true
    })

    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('healthy')
    expect(res.body.databases.postgres.status).toBe('connected')
    expect(res.body.databases.redis.status).toBe('connected')
  })

  it('returns 503 degraded when Redis is down', async () => {
    ;(prismaMock.$queryRaw as jest.Mock).mockResolvedValueOnce([1])
    Object.defineProperty(redisMock, 'isReady', {
      get: () => false,
      configurable: true
    })

    const res = await request(app).get('/api/health')

    expect(res.status).toBe(503)
    expect(res.body.status).toBe('degraded')
    expect(res.body.databases.postgres.status).toBe('connected')
    expect(res.body.databases.redis.status).toBe('disconnected')
  })

  it('returns 503 degraded when Postgres is down', async () => {
    ;(prismaMock.$queryRaw as jest.Mock).mockRejectedValueOnce(
      new Error('ECONNREFUSED')
    )
    ;(redisMock.ping as jest.Mock).mockResolvedValueOnce('PONG')
    Object.defineProperty(redisMock, 'isReady', {
      get: () => true,
      configurable: true
    })

    const res = await request(app).get('/api/health')

    expect(res.status).toBe(503)
    expect(res.body.status).toBe('degraded')
    expect(res.body.databases.postgres.status).toBe('disconnected')
    expect(res.body.databases.postgres.error).toBe('ECONNREFUSED')
    expect(res.body.databases.redis.status).toBe('connected')
  })
})
