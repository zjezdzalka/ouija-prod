// Mock the lib/prisma module so no real DB connection is made
jest.mock('../src/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    friendship: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    chat: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    chatUser: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    message: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    reaction: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  }
}))

// Mock redis so no real Redis connection is made.
// validateSessionToken always resolves to a valid userId so requireAuth
// middleware passes in every test without needing a real token.
jest.mock('../src/lib/redis', () => ({
  redis: {
    isReady: true,
    ping: jest.fn().mockResolvedValue('PONG'),
    connect: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    get: jest.fn().mockImplementation((key: string) => {
      // Session token validation: any key starting with 'session:' returns a userId
      if (key.startsWith('session:')) return Promise.resolve('user_alice_001')
      return Promise.resolve(null)
    }),
    set: jest.fn().mockResolvedValue('OK'),
    lRange: jest.fn().mockResolvedValue([]),
    lPush: jest.fn().mockResolvedValue(1),
    rPush: jest.fn().mockResolvedValue(1),
    lRem: jest.fn().mockResolvedValue(1),
    lSet: jest.fn().mockResolvedValue('OK'),
    lTrim: jest.fn().mockResolvedValue('OK'),
    lLen: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(1)
  }
}))

// Convenience: add Authorization header to all supertest requests in tests.
// Tests that call request(app).get('/api/...') will automatically get auth.
import supertest from 'supertest'

export const TEST_TOKEN = 'test-session-token-alice'
export const TEST_USER_ID = 'user_alice_001'

/**
 * Helper that returns a supertest agent pre-configured with the test auth header.
 * Use: const api = authedRequest(app)
 *      await api.get('/api/...').expect(200)
 */
export function authedRequest(app: Parameters<typeof supertest>[0]) {
  return {
    get: (url: string) =>
      supertest(app).get(url).set('Authorization', `Bearer ${TEST_TOKEN}`),
    post: (url: string) =>
      supertest(app).post(url).set('Authorization', `Bearer ${TEST_TOKEN}`),
    put: (url: string) =>
      supertest(app).put(url).set('Authorization', `Bearer ${TEST_TOKEN}`),
    delete: (url: string) =>
      supertest(app).delete(url).set('Authorization', `Bearer ${TEST_TOKEN}`)
  }
}
