import request from 'supertest'
import { TEST_TOKEN } from './setup'
import { app } from '@/app'
import { prisma } from '@/lib'
import {
  mockUser1,
  mockUser2,
  mockUser3,
  mockPrivateChat,
  mockGroupChat
} from './fixtures'
import { ChatRole, PrismaClient } from '@prisma/client'
import { Mocked } from 'jest-mock'

const db = prisma as Mocked<PrismaClient>

/** Cast a partial fixture to whatever type the mock method expects. */
function asResult<T>(val: unknown): T {
  return val as T
}

/** Cast a Prisma mock method to a plain jest.Mock to bypass overloaded signatures. */
function asMock(fn: unknown): jest.Mock {
  return fn as unknown as jest.Mock
}

const SESSION_USER = 'user_alice_001'
const aliceMemberPrivate = {
  chatId: mockPrivateChat.id,
  userId: SESSION_USER,
  role: ChatRole.ADMIN,
  joinedAt: new Date()
}
const aliceMemberGroup = {
  chatId: mockGroupChat.id,
  userId: SESSION_USER,
  role: ChatRole.ADMIN,
  joinedAt: new Date()
}

beforeEach(() => {
  jest.clearAllMocks()

  asMock(db.user.findUnique).mockImplementation(
    async (args: { where: Record<string, unknown> }) => {
      const w = args?.where ?? {}
      if (w.id === 'user_alice_001') return mockUser1
      if (w.id === 'user_bob_002') return mockUser2
      if (w.id === 'user_carol_003') return mockUser3
      return null
    }
  )
})

describe('GET /api/chats/:chatId', () => {
  it('returns a chat by id', async () => {
    db.chatUser.findUnique.mockResolvedValueOnce(asResult(aliceMemberPrivate))
    db.chat.findUnique.mockResolvedValueOnce(asResult(mockPrivateChat))

    const res = await request(app)
      .get('/api/chats/chat_private_001')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe('chat_private_001')
    expect(res.body.type).toBe('PRIVATE')
  })

  it('returns 404 if chat not found', async () => {
    db.chatUser.findUnique.mockResolvedValueOnce(asResult(aliceMemberPrivate))
    db.chat.findUnique.mockResolvedValueOnce(asResult(null))

    const res = await request(app)
      .get('/api/chats/nonexistent')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/not found/)
  })
})

describe('GET /api/users/:userId/chats', () => {
  it('returns all chats for a user', async () => {
    db.chat.findMany.mockResolvedValueOnce(
      asResult([mockPrivateChat, mockGroupChat])
    )

    const res = await request(app)
      .get('/api/users/user_alice_001/chats')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })
})

describe('POST /api/chats', () => {
  it('creates a private chat between two users', async () => {
    asMock(db.$transaction).mockImplementationOnce(
      (fn: (tx: unknown) => unknown) =>
        fn({
          chat: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockPrivateChat)
          }
        })
    )

    const res = await request(app)
      .post('/api/chats')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ type: 'PRIVATE', userIds: ['user_alice_001', 'user_bob_002'] })

    expect(res.status).toBe(201)
    expect(res.body.type).toBe('PRIVATE')
    expect(res.body.users).toHaveLength(2)
  })

  it('creates a group chat with a name', async () => {
    db.chat.create.mockResolvedValueOnce(asResult(mockGroupChat))

    const res = await request(app)
      .post('/api/chats')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({
        name: 'Ouija Dev Team',
        type: 'GROUP',
        userIds: ['user_alice_001', 'user_bob_002', 'user_carol_003']
      })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Ouija Dev Team')
    expect(res.body.users).toHaveLength(3)
  })

  it('returns 400 if group chat has no name', async () => {
    const res = await request(app)
      .post('/api/chats')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ type: 'GROUP', userIds: ['user_alice_001', 'user_bob_002'] })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/name/)
  })

  it('returns 400 if fewer than 2 users provided', async () => {
    const res = await request(app)
      .post('/api/chats')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ type: 'PRIVATE', userIds: ['user_alice_001'] })

    expect(res.status).toBe(400)
  })
})

describe('PUT /api/chats/:chatId', () => {
  it('updates a group chat name', async () => {
    db.chatUser.findUnique.mockResolvedValueOnce(asResult(aliceMemberGroup))
    db.chat.findUnique.mockResolvedValueOnce(asResult(mockGroupChat))
    db.chat.update.mockResolvedValueOnce(
      asResult({ ...mockGroupChat, name: 'New Name' })
    )

    const res = await request(app)
      .put('/api/chats/chat_group_002')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ name: 'New Name' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('New Name')
  })
})

describe('DELETE /api/chats/:chatId', () => {
  it('deletes a chat and returns 204', async () => {
    db.chatUser.findUnique.mockResolvedValueOnce(asResult(aliceMemberGroup))
    db.chat.findUnique.mockResolvedValueOnce(asResult(mockGroupChat))
    db.chat.delete.mockResolvedValueOnce(asResult(mockGroupChat))

    const res = await request(app)
      .delete('/api/chats/chat_group_002')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(204)
  })
})

describe('POST /api/chats/:chatId/members', () => {
  it('adds a new member to a chat', async () => {
    const newMember = {
      chatId: mockGroupChat.id,
      userId: mockUser3.id,
      role: ChatRole.MEMBER,
      joinedAt: new Date()
    }
    db.chatUser.findUnique.mockResolvedValueOnce(asResult(aliceMemberGroup))
    db.chat.findUnique.mockResolvedValueOnce(asResult(mockGroupChat))
    db.chatUser.findUnique.mockResolvedValueOnce(asResult(null))
    db.chatUser.create.mockResolvedValueOnce(asResult(newMember))

    const res = await request(app)
      .post('/api/chats/chat_group_002/members')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ userId: 'user_carol_003' })

    expect(res.status).toBe(201)
    expect(res.body.role).toBe('MEMBER')
  })

  it('returns 409 if user is already a member', async () => {
    db.chatUser.findUnique.mockResolvedValueOnce(asResult(aliceMemberGroup))
    db.chat.findUnique.mockResolvedValueOnce(asResult(mockGroupChat))
    db.chatUser.findUnique.mockResolvedValueOnce(
      asResult({
        chatId: mockGroupChat.id,
        userId: mockUser2.id,
        role: ChatRole.MEMBER,
        joinedAt: new Date()
      })
    )

    const res = await request(app)
      .post('/api/chats/chat_group_002/members')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ userId: 'user_bob_002' })

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/already in chat/)
  })
})

describe('PUT /api/chats/:chatId/members/:userId', () => {
  it('promotes a member to admin', async () => {
    db.chatUser.findUnique
      .mockResolvedValueOnce(asResult(aliceMemberGroup))
      .mockResolvedValueOnce(
        asResult({
          chatId: mockGroupChat.id,
          userId: mockUser2.id,
          role: ChatRole.MEMBER,
          joinedAt: new Date()
        })
      )
    db.chatUser.update.mockResolvedValueOnce(
      asResult({
        chatId: mockGroupChat.id,
        userId: mockUser2.id,
        role: ChatRole.ADMIN,
        joinedAt: new Date()
      })
    )

    const res = await request(app)
      .put('/api/chats/chat_group_002/members/user_bob_002')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ role: 'ADMIN' })

    expect(res.status).toBe(200)
    expect(res.body.role).toBe('ADMIN')
  })
})

describe('DELETE /api/chats/:chatId/members/:userId', () => {
  it('removes a member from a chat and returns 204', async () => {
    asMock(db.chatUser.findUnique).mockImplementation(
      async (args: {
        where: { chatId_userId?: { chatId: string; userId: string } }
      }) => {
        const key = args.where.chatId_userId
        if (
          key?.chatId === 'chat_group_002' &&
          key?.userId === 'user_alice_001'
        ) {
          return {
            chatId: 'chat_group_002',
            userId: 'user_alice_001',
            role: ChatRole.ADMIN,
            joinedAt: new Date()
          }
        }
        if (
          key?.chatId === 'chat_group_002' &&
          key?.userId === 'user_bob_002'
        ) {
          return {
            chatId: 'chat_group_002',
            userId: 'user_bob_002',
            role: ChatRole.MEMBER,
            joinedAt: new Date()
          }
        }
        return null
      }
    )

    db.chatUser.delete.mockResolvedValueOnce(
      asResult({
        chatId: 'chat_group_002',
        userId: 'user_bob_002',
        role: ChatRole.MEMBER,
        joinedAt: new Date()
      })
    )

    const res = await request(app)
      .delete('/api/chats/chat_group_002/members/user_bob_002')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(204)
  })
})
