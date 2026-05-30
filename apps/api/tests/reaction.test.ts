import request from 'supertest'
import { TEST_TOKEN } from './setup'
import { app } from '@/app'
import { prisma } from '@/lib'
import { mockReaction1, mockReaction2 } from './fixtures'
import { ReactionType, PrismaClient } from '@prisma/client'
import { Mocked } from 'jest-mock'

const db = prisma as Mocked<PrismaClient>

beforeEach(() => jest.clearAllMocks())

describe('GET /api/messages/:messageId/reactions', () => {
  it('returns all reactions for a message', async () => {
    db.reaction.findMany.mockResolvedValueOnce([mockReaction1, mockReaction2])

    const res = await request(app).get('/api/messages/1/reactions').set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].type).toBe('LIKE')
    expect(res.body[1].type).toBe('LOVE')
  })
})

describe('POST /api/messages/:messageId/reactions', () => {
  it('adds a reaction to a message', async () => {
    db.reaction.findUnique.mockResolvedValueOnce(null) // no existing reaction
    db.reaction.create.mockResolvedValueOnce(mockReaction1)

    const res = await request(app)
      .post('/api/messages/1/reactions')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ userId: 'user_bob_002', type: 'LIKE' })

    expect(res.status).toBe(201)
    expect(res.body.type).toBe('LIKE')
  })

  it('returns 500 if reaction already exists', async () => {
    db.reaction.findUnique.mockResolvedValueOnce(mockReaction1) // already reacted

    const res = await request(app)
      .post('/api/messages/1/reactions')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ userId: 'user_bob_002', type: 'LIKE' })

    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/already exists/)
  })
})

describe('PUT /api/messages/:messageId/reactions/:userId', () => {
  it('changes a reaction type', async () => {
    db.reaction.findUnique.mockResolvedValueOnce(mockReaction1)
    db.reaction.update.mockResolvedValueOnce({
      ...mockReaction1,
      type: ReactionType.LAUGH
    })

    const res = await request(app)
      .put('/api/messages/1/reactions/user_bob_002')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ type: 'LAUGH' })

    expect(res.status).toBe(200)
    expect(res.body.type).toBe('LAUGH')
  })

  it('returns 500 if reaction does not exist', async () => {
    db.reaction.findUnique.mockResolvedValueOnce(null)

    const res = await request(app)
      .put('/api/messages/1/reactions/user_bob_002')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ type: 'LAUGH' })

    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/not found/)
  })
})

describe('DELETE /api/messages/:messageId/reactions/:userId', () => {
  it('removes a reaction and returns 204', async () => {
    db.reaction.findUnique.mockResolvedValueOnce(mockReaction1)
    db.reaction.delete.mockResolvedValueOnce(mockReaction1)

    const res = await request(app).delete(
      '/api/messages/1/reactions/user_bob_002'
    )

    expect(res.status).toBe(204)
  })

  it('returns 500 if reaction does not exist', async () => {
    db.reaction.findUnique.mockResolvedValueOnce(null)

    const res = await request(app).delete(
      '/api/messages/1/reactions/nonexistent_user'
    )

    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/not found/)
  })
})
