import request from 'supertest'
import { TEST_TOKEN } from './setup'
import { app } from '@/app'
import { prisma } from '@/lib'
import * as features from '@/lib/features'
import { mockUser1 } from './fixtures'

import { PrismaClient, type User } from '@prisma/client'
import { Mocked } from 'jest-mock'

const db = prisma as Mocked<PrismaClient>

beforeEach(() => jest.clearAllMocks())

// ─── GET /api/auth/config ─────────────────────────────────────────────────────

describe('GET /api/auth/config', () => {
  it('returns feature flags with defaults off', async () => {
    jest
      .spyOn(features, 'REQUIRE_EMAIL_VERIFICATION', 'get')
      .mockReturnValue(false)
    jest.spyOn(features, 'ENABLE_PASSWORD_RESET', 'get').mockReturnValue(false)

    const res = await request(app).get('/api/auth/config').set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body.requireEmailVerification).toBe(false)
    expect(res.body.enablePasswordReset).toBe(false)
  })

  it('reflects flags when both are enabled', async () => {
    jest
      .spyOn(features, 'REQUIRE_EMAIL_VERIFICATION', 'get')
      .mockReturnValue(true)
    jest.spyOn(features, 'ENABLE_PASSWORD_RESET', 'get').mockReturnValue(true)

    const res = await request(app).get('/api/auth/config').set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body.requireEmailVerification).toBe(true)
    expect(res.body.enablePasswordReset).toBe(true)
  })
})

// ─── POST /api/auth/register ──────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  const validBody = {
    email: 'newuser@ouija.dev',
    password: 'secret123',
    nickname: 'newuser'
  }

  it('creates account and returns 201 when verification is off', async () => {
    jest
      .spyOn(features, 'REQUIRE_EMAIL_VERIFICATION', 'get')
      .mockReturnValue(false)

    db.user.findUnique.mockResolvedValue(null) // no existing email
    db.user.findFirst.mockResolvedValue(null) // no existing nickname
    db.user.create.mockResolvedValueOnce({
      ...mockUser1,
      id: 'user_new_001',
      email: validBody.email,
      nickname: validBody.nickname,
      emailVerified: true
    } as unknown as User)

    const res = await request(app).post('/api/auth/register').set('Authorization', `Bearer ${TEST_TOKEN}`).send(validBody)

    expect(res.status).toBe(201)
    expect(res.body.requiresVerification).toBe(false)
    expect(res.body.email).toBe(validBody.email)
  })

  it('returns 409 when email is already taken', async () => {
    db.user.findUnique.mockResolvedValueOnce(mockUser1 as unknown as User) // email exists

    const res = await request(app).post('/api/auth/register').set('Authorization', `Bearer ${TEST_TOKEN}`).send(validBody)

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch('email already exists')
  })

  it('returns 409 when nickname is already taken', async () => {
    db.user.findUnique.mockResolvedValueOnce(null) // email free
    db.user.findFirst.mockResolvedValueOnce(mockUser1 as unknown as User)

    const res = await request(app).post('/api/auth/register').set('Authorization', `Bearer ${TEST_TOKEN}`).send(validBody)

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch('nickname already exists')
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ email: 'incomplete@ouija.dev' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch('data is incomplete')
  })
})

// ─── Feature-flag gating ──────────────────────────────────────────────────────

describe('GET /api/auth/verify-email (feature flag off)', () => {
  it('returns 404 when email verification is disabled', async () => {
    jest
      .spyOn(features, 'REQUIRE_EMAIL_VERIFICATION', 'get')
      .mockReturnValue(false)

    const res = await request(app)
      .get('/api/auth/verify-email')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .query({ token: 'any-token' })

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch('email verification is not enabled')
  })
})

describe('POST /api/auth/forgot-password (feature flag off)', () => {
  it('returns 404 when password reset is disabled', async () => {
    jest.spyOn(features, 'ENABLE_PASSWORD_RESET', 'get').mockReturnValue(false)

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ email: 'alice@ouija.dev' })

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch('password reset is not enabled')
  })
})

describe('POST /api/auth/reset-password (feature flag off)', () => {
  it('returns 404 when password reset is disabled', async () => {
    jest.spyOn(features, 'ENABLE_PASSWORD_RESET', 'get').mockReturnValue(false)

    const res = await request(app)
      .post('/api/auth/reset-password')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ token: 'tok', newPassword: 'newpass' })

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch('password reset is not enabled')
  })
})
