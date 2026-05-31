import request from 'supertest'
import { TEST_TOKEN } from './setup'
import { app } from '@/app'
import { prisma } from '@/lib'
import {
  mockUser1,
  mockReaction1,
  mockReaction2,
  mockPrivateChat
} from './fixtures'
import { ReactionType, PrismaClient } from '@prisma/client'
import { Mocked } from 'jest-mock'

const db = prisma as Mocked<PrismaClient>

function asResult<T>(val: unknown): T {
  return val as T
}

function asMock(fn: unknown): jest.Mock {
  return fn as unknown as jest.Mock
}

const CHAT_ID = mockPrivateChat.id
const MESSAGE_ID = mockReaction1.messageId
const SESSION_USER = 'user_alice_001'

const mockMembership = {
  chatId: CHAT_ID,
  userId: SESSION_USER,
  role: 'MEMBER',
  joinedAt: new Date()
}

function reactionsUrl(messageId = MESSAGE_ID) {
  return `/api/chats/${CHAT_ID}/messages/${messageId}/reactions`
}

beforeEach(() => {
  jest.clearAllMocks()
  asMock(db.user.findUnique).mockImplementation(
    async (args: { where: Record<string, unknown> }) => {
      if (args?.where?.id === 'user_alice_001') return mockUser1
      return null
    }
  )
  db.chatUser.findUnique.mockResolvedValue(asResult(mockMembership))
})

describe('GET /api/chats/:chatId/messages/:messageId/reactions', () => {
  it('returns all reactions for a message', async () => {
    db.reaction.findMany.mockResolvedValueOnce(
      asResult([mockReaction1, mockReaction2])
    )

    const res = await request(app)
      .get(reactionsUrl())
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].type).toBe('LIKE')
    expect(res.body[1].type).toBe('LOVE')
  })
})

describe('POST /api/chats/:chatId/messages/:messageId/reactions', () => {
  it('adds a reaction to a message', async () => {
    db.reaction.findUnique.mockResolvedValueOnce(asResult(null))
    db.reaction.create.mockResolvedValueOnce(asResult(mockReaction1))
    db.message.findUnique.mockResolvedValueOnce(asResult(null))

    const res = await request(app)
      .post(reactionsUrl())
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ type: 'LIKE' })

    expect(res.status).toBe(201)
    expect(res.body.type).toBe('LIKE')
  })

  it('returns 400 if reaction already exists', async () => {
    db.reaction.findUnique.mockResolvedValueOnce(asResult(mockReaction1))

    const res = await request(app)
      .post(reactionsUrl())
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ type: 'LIKE' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
  })
})

describe('PUT /api/chats/:chatId/messages/:messageId/reactions', () => {
  it('changes a reaction type', async () => {
    db.reaction.findUnique.mockResolvedValueOnce(asResult(mockReaction1))
    db.reaction.update.mockResolvedValueOnce(
      asResult({ ...mockReaction1, type: ReactionType.LAUGH })
    )
    db.message.findUnique.mockResolvedValueOnce(asResult(null))

    const res = await request(app)
      .put(reactionsUrl())
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ type: 'LAUGH' })

    expect(res.status).toBe(200)
    expect(res.body.type).toBe('LAUGH')
  })

  it('returns 400 if reaction does not exist', async () => {
    db.reaction.findUnique.mockResolvedValueOnce(asResult(null))

    const res = await request(app)
      .put(reactionsUrl())
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ type: 'LAUGH' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
  })
})

describe('DELETE /api/chats/:chatId/messages/:messageId/reactions', () => {
  it('removes a reaction and returns 204', async () => {
    db.reaction.findUnique.mockResolvedValueOnce(asResult(mockReaction1))
    db.reaction.delete.mockResolvedValueOnce(asResult(mockReaction1))
    db.message.findUnique.mockResolvedValueOnce(asResult(null))

    const res = await request(app)
      .delete(reactionsUrl())
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(204)
  })

  it('returns 400 if reaction does not exist', async () => {
    db.reaction.findUnique.mockResolvedValueOnce(asResult(null))

    const res = await request(app)
      .delete(reactionsUrl())
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
  })
})
