import request from 'supertest'
import { TEST_TOKEN } from './setup'
import { app } from '@/app'
import { prisma } from '@/lib'
import { redis } from '@/lib'
import {
  mockMessage1,
  mockMessage2,
  mockMessageWithAttachment
} from './fixtures'

import { PrismaClient } from '@prisma/client'
import { Mocked } from 'jest-mock'

const db = prisma as Mocked<PrismaClient>
const redisMock = redis as Mocked<typeof redis>

beforeEach(() => jest.clearAllMocks())

describe('GET /api/chats/:chatId/messages', () => {
  it('returns messages from postgres when lastId=0', async () => {
    // lastId="0" is a truthy string → service calls redis.findMessage first (cache miss),
    // then falls back to postgres getAllMessages
    db.message.findMany.mockResolvedValueOnce([mockMessage2, mockMessage1])

    const res = await request(app).get(
      '/api/chats/chat_private_001/messages?limit=20&lastId=0'
    )

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].content).toBe('All good Alice, you?')
  })
})

describe('POST /api/chats/:chatId/messages', () => {
  it('creates a plain text message', async () => {
    db.message.create.mockResolvedValueOnce(mockMessage1)

    const res = await request(app)
      .post('/api/chats/chat_private_001/messages')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ userId: 'user_alice_001', content: 'Hey Bob, how are you?' })

    expect(res.status).toBe(201)
  })

  it('creates a message with an attachment', async () => {
    db.message.create.mockResolvedValueOnce(mockMessageWithAttachment)

    const res = await request(app)
      .post('/api/chats/chat_group_002/messages')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({
        userId: 'user_alice_001',
        content: 'Check this out',
        attachments: [
          { url: 'https://cdn.ouija.dev/files/report.pdf', type: 'FILE' }
        ]
      })

    expect(res.status).toBe(201)
  })

  it('returns 500 if content is null', async () => {
    const res = await request(app)
      .post('/api/chats/chat_private_001/messages')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ userId: 'user_alice_001', content: null })

    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/null/i)
  })
})

describe('PUT /api/chats/:chatId/messages/:messageId', () => {
  it('edits message content', async () => {
    // service.updateMessage: findMessage (findFirst) → update → redis.updateMessage (lRange, lSet)
    db.message.findFirst.mockResolvedValueOnce(mockMessage1)
    db.message.update.mockResolvedValueOnce({
      ...mockMessage1,
      content: 'Edited content'
    })
    redisMock.lRange.mockResolvedValueOnce([JSON.stringify(mockMessage1)])
    redisMock.lSet.mockResolvedValueOnce('OK')

    const res = await request(app)
      .put('/api/chats/chat_private_001/messages/msg_001')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ content: 'Edited content' })

    expect(res.status).toBe(200)
    expect(res.body.content).toBe('Edited content')
  })

  it('returns 500 if message does not exist', async () => {
    db.message.findFirst.mockResolvedValueOnce(null)

    const res = await request(app)
      .put('/api/chats/chat_private_001/messages/999')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ content: 'Ghost edit' })

    expect(res.status).toBe(500)
    expect(res.body.error).toMatch('Record does not exist')
  })
})

describe('DELETE /api/chats/:chatId/messages/:messageId', () => {
  it('deletes a message and returns 204', async () => {
    // service.deleteMessage: findMessage (findFirst) → deleteMessage → redis.deleteMessage (lRange, lRem)
    db.message.findFirst.mockResolvedValueOnce(mockMessage1)
    db.message.delete.mockResolvedValueOnce(mockMessage1)
    redisMock.lRange.mockResolvedValueOnce([JSON.stringify(mockMessage1)])
    redisMock.lRem.mockResolvedValueOnce(1)

    const res = await request(app).delete(
      '/api/chats/chat_private_001/messages/msg_001'
    )

    expect(res.status).toBe(204)
  })

  it('returns 500 if message does not exist', async () => {
    db.message.findFirst.mockResolvedValueOnce(null)

    const res = await request(app).delete(
      '/api/chats/chat_private_001/messages/999'
    )

    expect(res.status).toBe(500)
    expect(res.body.error).toMatch('Record does not exist')
  })
})
