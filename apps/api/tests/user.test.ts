import request from 'supertest'
import { TEST_TOKEN } from './setup'
import { app } from '@/app'
import { prisma } from '@/lib'
import { mockUser1, mockUser2, mockUser3 } from './fixtures'

import { PrismaClient } from '@prisma/client'
import { Mocked } from 'jest-mock'

const db = prisma as Mocked<PrismaClient>

beforeEach(() => jest.clearAllMocks())

describe('GET /api/', () => {
  it('returns all users', async () => {
    db.user.findMany.mockResolvedValueOnce([mockUser1, mockUser2, mockUser3])

    const res = await request(app).get('/api/').set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(3)
    expect(res.body[0].nickname).toBe('alice')
  })

  it('returns a user by id via ?id=', async () => {
    db.user.findUnique.mockResolvedValueOnce(mockUser1)

    const res = await request(app).get('/api/?id=user_alice_001').set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body.email).toBe('alice@ouija.dev')
  })

  it('returns a user by email via ?email=', async () => {
    db.user.findUnique.mockResolvedValueOnce(mockUser2)

    const res = await request(app).get('/api/?email=bob@ouija.dev').set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body.nickname).toBe('bob')
  })

  it('returns a user by nickname via ?nickname=', async () => {
    db.user.findUnique.mockResolvedValueOnce(mockUser3)

    const res = await request(app).get('/api/?nickname=carol').set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe('user_carol_003')
  })
})

describe('POST /api/', () => {
  it('creates a new user and returns 201', async () => {
    db.user.findUnique.mockResolvedValueOnce(null) // no existing user
    db.user.create.mockResolvedValueOnce(mockUser1)

    const res = await request(app).post('/api/').set('Authorization', `Bearer ${TEST_TOKEN}`).send({
      email: 'alice@ouija.dev',
      password: 'secret123',
      nickname: 'alice'
    })

    expect(res.status).toBe(201)
    expect(res.body.id).toBe('user_alice_001')
  })

  it('returns 500 if user already exists', async () => {
    db.user.findUnique.mockResolvedValueOnce(mockUser1) // already exists

    const res = await request(app).post('/api/').set('Authorization', `Bearer ${TEST_TOKEN}`).send({
      email: 'alice@ouija.dev',
      password: 'secret123',
      nickname: 'alice'
    })

    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/already exists/)
  })

  it('returns 500 if required fields are missing', async () => {
    const res = await request(app)
      .post('/api/')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ email: 'alice@ouija.dev' }) // missing password and nickname

    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/incomplete/)
  })
})

describe('PUT /api/:id', () => {
  it('updates a user nickname', async () => {
    db.user.findUnique.mockResolvedValueOnce(mockUser1)
    db.user.update.mockResolvedValueOnce({
      ...mockUser1,
      nickname: 'alice_updated'
    })

    const res = await request(app)
      .put('/api/user_alice_001')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ nickname: 'alice_updated' })

    expect(res.status).toBe(200)
    expect(res.body.nickname).toBe('alice_updated')
  })

  it('returns 500 if user does not exist', async () => {
    db.user.findUnique.mockResolvedValueOnce(null)

    const res = await request(app)
      .put('/api/nonexistent_id')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ nickname: 'ghost' })

    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/does not exist/)
  })
})

describe('DELETE /api/:id', () => {
  it('deletes a user and returns 204', async () => {
    db.user.findUnique.mockResolvedValueOnce(mockUser1)
    db.user.delete.mockResolvedValueOnce(mockUser1)

    const res = await request(app).delete('/api/user_alice_001').set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(204)
  })

  it('returns 500 if user does not exist', async () => {
    db.user.findUnique.mockResolvedValueOnce(null)

    const res = await request(app).delete('/api/nonexistent_id').set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/does not exist/)
  })
})
