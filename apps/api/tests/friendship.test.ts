import request from 'supertest'
import { TEST_TOKEN } from './setup'
import { app } from '@/app'
import { prisma } from '@/lib'
import {
  mockUser1,
  mockUser2,
  mockFriendshipPending,
  mockFriendshipAccepted
} from './fixtures'
import { FriendStatus, PrismaClient } from '@prisma/client'
import { Mocked } from 'jest-mock'

const db = prisma as Mocked<PrismaClient>

beforeEach(() => jest.clearAllMocks())

describe('GET /api/users/:userId/friends', () => {
  it('returns all friendships for a user', async () => {
    db.user.findUnique.mockResolvedValueOnce(mockUser1)
    db.friendship.findMany.mockResolvedValueOnce([
      mockFriendshipPending,
      mockFriendshipAccepted
    ])

    const res = await request(app).get('/api/users/user_alice_001/friends').set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })

  it('filters by status=PENDING', async () => {
    db.user.findUnique.mockResolvedValueOnce(mockUser1)
    db.friendship.findMany.mockResolvedValueOnce([mockFriendshipPending])

    const res = await request(app).get(
      '/api/users/user_alice_001/friends?status=PENDING'
    )

    expect(res.status).toBe(200)
    expect(res.body[0].status).toBe('PENDING')
  })

  it('returns 500 if user does not exist', async () => {
    db.user.findUnique.mockResolvedValueOnce(null)

    const res = await request(app).get('/api/users/nonexistent/friends').set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/not found/i)
  })
})

describe('POST /api/users/:userId/friends', () => {
  it('sends a friend request', async () => {
    db.user.findUnique
      .mockResolvedValueOnce(mockUser1) // userId exists
      .mockResolvedValueOnce(mockUser2) // friendId exists
    db.friendship.findUnique.mockResolvedValueOnce(null) // not yet friends
    db.friendship.create.mockResolvedValueOnce(mockFriendshipPending)

    const res = await request(app)
      .post('/api/users/user_alice_001/friends')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ friendId: 'user_bob_002' })

    expect(res.status).toBe(201)
    expect(res.body.status).toBe('PENDING')
  })

  it('returns 500 if friendship already exists', async () => {
    db.user.findUnique
      .mockResolvedValueOnce(mockUser1)
      .mockResolvedValueOnce(mockUser2)
    db.friendship.findUnique.mockResolvedValueOnce(mockFriendshipPending) // already exists

    const res = await request(app)
      .post('/api/users/user_alice_001/friends')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ friendId: 'user_bob_002' })

    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/already exists/)
  })

  it('returns 500 if user tries to friend themselves', async () => {
    const res = await request(app)
      .post('/api/users/user_alice_001/friends')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ friendId: 'user_alice_001' })

    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/yourself/)
  })
})

describe('PUT /api/users/:userId/friends/:friendId', () => {
  it('accepts a friend request', async () => {
    db.friendship.findUnique.mockResolvedValueOnce(mockFriendshipPending)
    db.friendship.update.mockResolvedValueOnce({
      ...mockFriendshipPending,
      status: FriendStatus.ACCEPTED
    })

    const res = await request(app)
      .put('/api/users/user_alice_001/friends/user_bob_002')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ status: 'ACCEPTED' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ACCEPTED')
  })

  it('blocks a user', async () => {
    db.friendship.findUnique.mockResolvedValueOnce(mockFriendshipAccepted)
    db.friendship.update.mockResolvedValueOnce({
      ...mockFriendshipAccepted,
      status: FriendStatus.BLOCKED
    })

    const res = await request(app)
      .put('/api/users/user_alice_001/friends/user_carol_003')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ status: 'BLOCKED' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('BLOCKED')
  })
})

describe('DELETE /api/users/:userId/friends/:friendId', () => {
  it('removes a friendship and returns 204', async () => {
    db.friendship.findUnique.mockResolvedValueOnce(mockFriendshipAccepted)
    db.friendship.delete.mockResolvedValueOnce(mockFriendshipAccepted)

    const res = await request(app).delete(
      '/api/users/user_alice_001/friends/user_carol_003'
    )

    expect(res.status).toBe(204)
  })

  it('returns 500 if friendship does not exist', async () => {
    db.friendship.findUnique.mockResolvedValueOnce(null)

    const res = await request(app).delete(
      '/api/users/user_alice_001/friends/user_bob_002'
    )

    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/not found/)
  })
})
