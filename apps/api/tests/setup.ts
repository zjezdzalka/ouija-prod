// tests/setup.ts
import type { Request, Response, NextFunction } from 'express'

// 1. Mock Prisma Client Enum/Types
jest.mock('@prisma/client', () => {
  const UserStatus = {
    ONLINE: 'ONLINE',
    OFFLINE: 'OFFLINE',
    AWAY: 'AWAY',
    BUSY: 'BUSY',
    INVISIBLE: 'INVISIBLE'
  }
  const FriendStatus = {
    PENDING: 'PENDING',
    ACCEPTED: 'ACCEPTED',
    BLOCKED: 'BLOCKED'
  }
  const ChatType = { PRIVATE: 'PRIVATE', GROUP: 'GROUP' }
  const ChatRole = { MEMBER: 'MEMBER', ADMIN: 'ADMIN' }
  const AttachmentType = {
    IMAGE: 'IMAGE',
    VIDEO: 'VIDEO',
    FILE: 'FILE',
    AUDIO: 'AUDIO'
  }
  const ReactionType = {
    LIKE: 'LIKE',
    LOVE: 'LOVE',
    LAUGH: 'LAUGH',
    SAD: 'SAD',
    ANGRY: 'ANGRY',
    THUMBS_UP: 'THUMBS_UP',
    THUMBS_DOWN: 'THUMBS_DOWN'
  }
  const MediaPurpose = { AVATAR: 'AVATAR', ATTACHMENT: 'ATTACHMENT' }

  const PrismaClient = jest.fn().mockImplementation(() => ({}))

  return {
    PrismaClient,
    UserStatus,
    FriendStatus,
    ChatType,
    ChatRole,
    AttachmentType,
    ReactionType,
    MediaPurpose
  }
})

// 2. Mock the Prisma instance using the alias
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    $transaction: jest.fn().mockImplementation((fn: (tx: unknown) => unknown) =>
      fn({
        chat: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(null)
        }
      })
    ),
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    friendship: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
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
      delete: jest.fn(),
      findMany: jest.fn().mockResolvedValue([])
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

// 3. Mock the Auth Middleware using the alias
jest.mock('@/middleware/auth.middleware', () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    ;(req as Request & { userId: string }).userId = 'user_alice_001'
    next()
  }
}))

// 4. Mock Redis using the alias
jest.mock('@/lib/redis', () => ({
  redis: {
    isReady: true,
    ping: jest.fn().mockResolvedValue('PONG'),
    connect: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    get: jest.fn().mockImplementation((key: string) => {
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

import supertest from 'supertest'

export const TEST_TOKEN = 'test-session-token-alice'
export const TEST_USER_ID = 'user_alice_001'

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
