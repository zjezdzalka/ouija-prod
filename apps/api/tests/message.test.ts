import request from 'supertest'
import { TEST_TOKEN } from './setup'
import { app } from '@/app'
import { prisma } from '@/lib'
import { redis } from '@/lib'
import {
  mockUser1,
  mockMessage1,
  mockMessage2,
  mockMessageWithAttachment
} from './fixtures'

import { PrismaClient } from '@prisma/client'
import { Mocked } from 'jest-mock'

const db = prisma as Mocked<PrismaClient>
const redisMock = redis as Mocked<typeof redis>

function asResult<T>(val: unknown): T {
  return val as T
}

function asMock(fn: unknown): jest.Mock {
  return fn as unknown as jest.Mock
}

const CHAT_ID_PRIVATE = 'chat_private_001'
const CHAT_ID_GROUP = 'chat_group_002'
const SESSION_USER = 'user_alice_001'

const mockMembership = {
  chatId: CHAT_ID_PRIVATE,
  userId: SESSION_USER,
  role: 'MEMBER',
  joinedAt: new Date()
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
  db.message.findFirst.mockResolvedValue(asResult(mockMessage1))
})

describe('GET /api/chats/:chatId/messages', () => {
  it('returns messages from postgres when lastId=0', async () => {
    db.message.findMany.mockResolvedValueOnce(
      asResult([mockMessage2, mockMessage1])
    )

    const res = await request(app)
      .get(`/api/chats/${CHAT_ID_PRIVATE}/messages?limit=20&lastId=0`)
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].content).toBe('All good Alice, you?')
  })
})

describe('POST /api/chats/:chatId/messages', () => {
  it('creates a plain text message', async () => {
    db.message.create.mockResolvedValueOnce(asResult(mockMessage1))

    const res = await request(app)
      .post(`/api/chats/${CHAT_ID_PRIVATE}/messages`)
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ content: 'Hey Bob, how are you?' })

    expect(res.status).toBe(201)
  })

  it('creates a message with an attachment', async () => {
    db.message.create.mockResolvedValueOnce(asResult(mockMessageWithAttachment))

    const res = await request(app)
      .post(`/api/chats/${CHAT_ID_GROUP}/messages`)
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({
        content: 'Check this out',
        attachments: [
          { url: 'https://cdn.ouija.dev/files/report.pdf', type: 'FILE' }
        ]
      })

    expect(res.status).toBe(201)
  })

  it('returns 400 if content and attachments are both empty', async () => {
    const res = await request(app)
      .post(`/api/chats/${CHAT_ID_PRIVATE}/messages`)
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ content: null })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Content and attachments/i)
  })
})

describe('PUT /api/chats/:chatId/messages/:messageId', () => {
  it('edits message content', async () => {
    db.message.findFirst
      .mockResolvedValueOnce(asResult(mockMessage1))
      .mockResolvedValueOnce(asResult(mockMessage1))
    db.message.update.mockResolvedValueOnce(
      asResult({ ...mockMessage1, content: 'Edited content' })
    )
    redisMock.lRange.mockResolvedValueOnce([JSON.stringify(mockMessage1)])
    redisMock.lSet.mockResolvedValueOnce('OK')

    const res = await request(app)
      .put(`/api/chats/${CHAT_ID_PRIVATE}/messages/msg_001`)
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ content: 'Edited content' })

    expect(res.status).toBe(200)
    expect(res.body.content).toBe('Edited content')
  })

  it('returns 404 if message does not exist', async () => {
    db.message.findFirst.mockResolvedValueOnce(asResult(null))

    const res = await request(app)
      .put(`/api/chats/${CHAT_ID_PRIVATE}/messages/999`)
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ content: 'Ghost edit' })

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch('message not found')
  })
})

describe('DELETE /api/chats/:chatId/messages/:messageId', () => {
  it('deletes a message and returns 204', async () => {
    db.message.findFirst
      .mockResolvedValueOnce(asResult(mockMessage1))
      .mockResolvedValueOnce(asResult(mockMessage1))
    db.message.delete.mockResolvedValueOnce(asResult(mockMessage1))
    redisMock.lRange.mockResolvedValueOnce([JSON.stringify(mockMessage1)])
    redisMock.lRem.mockResolvedValueOnce(1)

    const res = await request(app)
      .delete(`/api/chats/${CHAT_ID_PRIVATE}/messages/msg_001`)
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(204)
  })

  it('returns 404 if message does not exist', async () => {
    db.message.findFirst.mockResolvedValueOnce(asResult(null))

    const res = await request(app)
      .delete(`/api/chats/${CHAT_ID_PRIVATE}/messages/999`)
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch('message not found')
  })
})
