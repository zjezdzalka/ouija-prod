import request from 'supertest'
import { TEST_TOKEN } from './setup'
import { app } from '@/app'
import { prisma } from '@/lib'
import {
  mockUser1,
  mockUser2,
  mockUser3,
  mockFriendshipPending,
  mockFriendshipAccepted
} from './fixtures'
import { FriendStatus, PrismaClient } from '@prisma/client'
import { Mocked } from 'jest-mock'

const db = prisma as Mocked<PrismaClient>

function asResult<T>(val: unknown): T {
  return val as T
}

function asMock(fn: unknown): jest.Mock {
  return fn as unknown as jest.Mock
}

beforeEach(() => {
  jest.clearAllMocks()

  asMock(db.user.findUnique).mockImplementation(
    async (args: { where: Record<string, unknown> }) => {
      const w = args?.where ?? {}
      if (w.id === 'user_alice_001') return mockUser1
      if (w.id === 'user_bob_002') return mockUser2
      if (w.id === 'user_carol_003') return mockUser3
      if (w.email === 'alice@ouija.dev') return mockUser1
      if (w.email === 'bob@ouija.dev') return mockUser2
      return null
    }
  )
})

describe('GET /api/users/:userId/friends', () => {
  it('returns all friendships for a user', async () => {
    db.user.findUnique.mockResolvedValueOnce(asResult(mockUser1))
    db.friendship.findMany.mockResolvedValueOnce(
      asResult([mockFriendshipPending, mockFriendshipAccepted])
    )

    const res = await request(app)
      .get('/api/users/user_alice_001/friends')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })

  it('filters by status=PENDING', async () => {
    db.user.findUnique.mockResolvedValueOnce(asResult(mockUser1))
    db.friendship.findMany.mockResolvedValueOnce(
      asResult([mockFriendshipPending])
    )

    const res = await request(app)
      .get('/api/users/user_alice_001/friends?status=PENDING')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body[0].status).toBe('PENDING')
  })

  it("returns 403 when trying to view another user's friendships", async () => {
    const res = await request(app)
      .get('/api/users/user_bob_002/friends')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(
      /forbidden: you can only perform this action for yourself/
    )
  })
})

describe('POST /api/users/:userId/friends', () => {
  it('sends a friend request', async () => {
    db.user.findUnique
      .mockResolvedValueOnce(asResult(mockUser1))
      .mockResolvedValueOnce(asResult(mockUser2))
    db.friendship.findFirst.mockResolvedValueOnce(asResult(null))
    db.friendship.create.mockResolvedValueOnce(asResult(mockFriendshipPending))

    const res = await request(app)
      .post('/api/users/user_alice_001/friends')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ friendId: 'user_bob_002' })

    expect(res.status).toBe(201)
    expect(res.body.status).toBe('PENDING')
  })

  it('returns 409 if friendship already exists', async () => {
    db.user.findUnique
      .mockResolvedValueOnce(asResult(mockUser1))
      .mockResolvedValueOnce(asResult(mockUser2))
    db.friendship.findFirst.mockResolvedValueOnce(
      asResult(mockFriendshipPending)
    )

    const res = await request(app)
      .post('/api/users/user_alice_001/friends')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ friendId: 'user_bob_002' })

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/already exists/)
  })

  it('returns 400 if user tries to friend themselves', async () => {
    const res = await request(app)
      .post('/api/users/user_alice_001/friends')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ friendId: 'user_alice_001' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/yourself/)
  })

  it('returns 403 when trying to send friend request from another user', async () => {
    const res = await request(app)
      .post('/api/users/user_bob_002/friends')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ friendId: 'user_carol_003' })

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(
      /forbidden: you can only perform this action for yourself/
    )
  })
})

describe('PUT /api/users/:userId/friends/:friendId', () => {
  it('accepts a friend request', async () => {
    const aliceIsRecipient = {
      ...mockFriendshipPending,
      userId: 'user_bob_002',
      friendId: 'user_alice_001'
    }
    db.friendship.findFirst
      .mockResolvedValueOnce(asResult(aliceIsRecipient))
      .mockResolvedValueOnce(asResult(aliceIsRecipient))
    db.friendship.update.mockResolvedValueOnce(
      asResult({ ...aliceIsRecipient, status: FriendStatus.ACCEPTED })
    )

    const res = await request(app)
      .put('/api/users/user_alice_001/friends/user_bob_002')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ status: 'ACCEPTED' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ACCEPTED')
  })

  it('blocks a user', async () => {
    db.friendship.findFirst
      .mockResolvedValueOnce(asResult(mockFriendshipAccepted))
      .mockResolvedValueOnce(asResult(mockFriendshipAccepted))
    db.friendship.update.mockResolvedValueOnce(
      asResult({ ...mockFriendshipAccepted, status: FriendStatus.BLOCKED })
    )

    const res = await request(app)
      .put('/api/users/user_alice_001/friends/user_carol_003')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ status: 'BLOCKED' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('BLOCKED')
  })

  it('returns 403 when non-recipient tries to accept a request', async () => {
    const res = await request(app)
      .put('/api/users/user_bob_002/friends/user_alice_001')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ status: 'ACCEPTED' })

    expect(res.status).toBe(403)
  })
})

describe('DELETE /api/users/:userId/friends/:friendId', () => {
  it('removes a friendship and returns 204', async () => {
    const existingFriendship = {
      userId: 'user_alice_001',
      friendId: 'user_carol_003',
      status: 'ACCEPTED',
      createdAt: new Date(),
      updatedAt: new Date(),
      user: mockUser1,
      friend: mockUser3
    }

    db.friendship.findFirst.mockResolvedValue(asResult(existingFriendship))
    db.friendship.delete.mockResolvedValue(asResult(existingFriendship))

    const res = await request(app)
      .delete('/api/users/user_alice_001/friends/user_carol_003')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(204)
  })

  it('returns 404 if friendship does not exist', async () => {
    db.friendship.findFirst.mockResolvedValueOnce(asResult(null))

    const res = await request(app)
      .delete('/api/users/user_alice_001/friends/user_bob_002')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/not found/)
  })

  it("returns 403 when trying to delete another user's friendship", async () => {
    const res = await request(app)
      .delete('/api/users/user_bob_002/friends/user_carol_003')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(
      /forbidden: you can only perform this action for yourself/
    )
  })
})
