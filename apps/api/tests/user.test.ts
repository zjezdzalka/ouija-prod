import request from 'supertest'
import { TEST_TOKEN } from './setup'
import { app } from '@/app'
import { prisma } from '@/lib'
import { mockUser1, mockUser2, mockUser3 } from './fixtures'

import { PrismaClient } from '@prisma/client'
import { Mocked } from 'jest-mock'

const db = prisma as Mocked<PrismaClient>

function asResult<T>(val: unknown): T {
  return val as T
}

beforeEach(() => jest.clearAllMocks())

describe('GET /api/', () => {
  it('returns 403 when trying to list all users (admin-only feature)', async () => {
    const res = await request(app)
      .get('/api/')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(
      /forbidden: user listing requires admin privileges/
    )
  })

  it('returns a user by id via ?id= (public profile for other users)', async () => {
    db.user.findUnique.mockResolvedValueOnce(asResult(mockUser2))

    const res = await request(app)
      .get('/api/?id=user_bob_002')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body.nickname).toBe('bob')
    expect(res.body.email).toBeUndefined()
  })

  it('returns own full profile (including email) when looking up self by id', async () => {
    db.user.findUnique.mockResolvedValueOnce(asResult(mockUser1))

    const res = await request(app)
      .get('/api/?id=user_alice_001')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body.email).toBe('alice@ouija.dev')
  })

  it('returns 404 when looking up another user by email (email enumeration prevented)', async () => {
    db.user.findUnique.mockResolvedValueOnce(asResult(mockUser2))

    const res = await request(app)
      .get('/api/?email=bob@ouija.dev')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/not found/)
  })

  it('returns 200 when looking up own email', async () => {
    db.user.findUnique.mockResolvedValueOnce(asResult(mockUser1))

    const res = await request(app)
      .get('/api/?email=alice@ouija.dev')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body.email).toBe('alice@ouija.dev')
  })

  it('returns a user by nickname via ?nickname= (public profile)', async () => {
    db.user.findUnique.mockResolvedValueOnce(asResult(mockUser3))

    const res = await request(app)
      .get('/api/?nickname=carol')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe('user_carol_003')
    expect(res.body.email).toBeUndefined()
  })

  it('searches users by query via ?q=', async () => {
    const searchResults = [
      { ...mockUser1, email: undefined },
      { ...mockUser2, email: undefined }
    ]
    db.user.findMany.mockResolvedValueOnce(asResult(searchResults))

    const res = await request(app)
      .get('/api/?q=alice')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].email).toBeUndefined()
  })
})

describe('POST /api/', () => {
  it('creates a new user and returns 201', async () => {
    db.user.findUnique.mockResolvedValueOnce(asResult(null))
    db.user.create.mockResolvedValueOnce(asResult(mockUser1))

    const res = await request(app)
      .post('/api/')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({
        email: 'alice@ouija.dev',
        password: 'secret123',
        nickname: 'alice'
      })

    expect(res.status).toBe(201)
    expect(res.body.id).toBe('user_alice_001')
  })

  it('returns 409 if user already exists', async () => {
    db.user.findUnique.mockResolvedValueOnce(asResult(mockUser1))

    const res = await request(app)
      .post('/api/')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({
        email: 'alice@ouija.dev',
        password: 'secret123',
        nickname: 'alice'
      })

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/already exists/)
  })

  it('returns 400 if required fields are missing', async () => {
    const res = await request(app)
      .post('/api/')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ email: 'alice@ouija.dev' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/expected string, received undefined/)
  })
})

describe('PUT /api/:id', () => {
  it('updates own user nickname', async () => {
    db.user.findUnique.mockResolvedValueOnce(asResult(mockUser1))
    db.user.update.mockResolvedValueOnce(
      asResult({
        ...mockUser1,
        nickname: 'alice_updated'
      })
    )

    const res = await request(app)
      .put('/api/user_alice_001')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ nickname: 'alice_updated' })

    expect(res.status).toBe(200)
    expect(res.body.nickname).toBe('alice_updated')
  })

  it('returns 403 when trying to update another user', async () => {
    const res = await request(app)
      .put('/api/user_bob_002')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ nickname: 'hacked' })

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(
      /forbidden: you can only update your own profile/
    )
  })

  it('returns 400 when trying to update non-existent own user (validation fails first)', async () => {
    const res = await request(app)
      .put('/api/user_alice_001')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/No update data provided/)
  })
})

describe('DELETE /api/:id', () => {
  it('deletes own user and returns 204', async () => {
    db.user.findUnique.mockResolvedValueOnce(asResult(mockUser1))
    db.user.delete.mockResolvedValueOnce(asResult(mockUser1))

    const res = await request(app)
      .delete('/api/user_alice_001')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(204)
  })

  it('returns 403 when trying to delete another user', async () => {
    const res = await request(app)
      .delete('/api/user_bob_002')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(
      /forbidden: you can only delete your own account/
    )
  })

  it('returns 400 when trying to delete non-existent own user', async () => {
    db.user.findUnique.mockResolvedValueOnce(asResult(null))

    const res = await request(app)
      .delete('/api/user_alice_001')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(400)
  })
})
