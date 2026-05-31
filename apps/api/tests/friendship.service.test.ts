/**
 * Unit tests for friendship.service.ts
 */

import { jest } from '@jest/globals'

jest.mock('@repositories/friendship.repository', () => ({
  getFriendships: jest.fn(),
  getFriendshipsByStatus: jest.fn(),
  getFriendship: jest.fn(),
  createFriendship: jest.fn(),
  updateFriendshipStatus: jest.fn(),
  deleteFriendship: jest.fn()
}))

jest.mock('@repositories/user.repository', () => ({
  getUserById: jest.fn()
}))

jest.mock('@services/media.service', () => ({
  rehydrateUser: jest.fn((u: unknown) => u)
}))

import * as friendshipService from '@services/friendship.service'
import * as friendshipRepo from '@repositories/friendship.repository'
import * as userRepo from '@repositories/user.repository'
import { FriendStatus } from '@prisma/client'

const mockRepo = friendshipRepo as jest.Mocked<typeof friendshipRepo>
const mockUserRepo = userRepo as jest.Mocked<typeof userRepo>

const user1 = { id: 'u1', nickname: 'alice', email: 'a@a.com', password: 'h', status: 'ONLINE' as const, avatarUrl: null, emailVerified: true, createdAt: new Date(), updatedAt: new Date() }
const user2 = { id: 'u2', nickname: 'bob',   email: 'b@b.com', password: 'h', status: 'ONLINE' as const, avatarUrl: null, emailVerified: true, createdAt: new Date(), updatedAt: new Date() }

const pendingFriendship = {
  userId: 'u1',
  friendId: 'u2',
  status: FriendStatus.PENDING,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: user1,
  friend: user2
}

beforeEach(() => jest.clearAllMocks())

// ── sendFriendRequest ─────────────────────────────────────────────────────────

describe('friendshipService.sendFriendRequest', () => {
  it('creates a friend request', async () => {
    mockUserRepo.getUserById.mockResolvedValueOnce(user1).mockResolvedValueOnce(user2)
    mockRepo.getFriendship.mockResolvedValue(null)
    mockRepo.createFriendship.mockResolvedValue(pendingFriendship)

    const result = await friendshipService.sendFriendRequest('u1', 'u2')
    expect(result.status).toBe(FriendStatus.PENDING)
  })

  it('throws when sending to yourself', async () => {
    await expect(friendshipService.sendFriendRequest('u1', 'u1')).rejects.toThrow(
      'Cannot befriend yourself'
    )
  })

  it('throws when friendship already exists', async () => {
    mockUserRepo.getUserById.mockResolvedValueOnce(user1).mockResolvedValueOnce(user2)
    mockRepo.getFriendship.mockResolvedValue(pendingFriendship)

    await expect(friendshipService.sendFriendRequest('u1', 'u2')).rejects.toThrow(
      'Friendship already exists'
    )
  })

  it('throws when the target user does not exist', async () => {
    mockUserRepo.getUserById.mockResolvedValueOnce(user1).mockResolvedValueOnce(null)

    await expect(friendshipService.sendFriendRequest('u1', 'ghost')).rejects.toThrow(
      'Friend not found'
    )
  })
})

// ── updateFriendshipStatus ────────────────────────────────────────────────────

describe('friendshipService.updateFriendshipStatus', () => {
  it('accepts a friend request', async () => {
    mockRepo.getFriendship.mockResolvedValue(pendingFriendship)
    mockRepo.updateFriendshipStatus.mockResolvedValue({
      ...pendingFriendship,
      status: FriendStatus.ACCEPTED
    })

    const result = await friendshipService.updateFriendshipStatus('u1', 'u2', FriendStatus.ACCEPTED)
    expect(result.status).toBe(FriendStatus.ACCEPTED)
  })

  it('throws when friendship not found', async () => {
    mockRepo.getFriendship.mockResolvedValue(null)
    await expect(
      friendshipService.updateFriendshipStatus('u1', 'ghost', FriendStatus.ACCEPTED)
    ).rejects.toThrow('Friendship not found')
  })
})

// ── deleteFriendship ──────────────────────────────────────────────────────────

describe('friendshipService.deleteFriendship', () => {
  it('deletes an existing friendship', async () => {
    mockRepo.getFriendship.mockResolvedValue(pendingFriendship)
    mockRepo.deleteFriendship.mockResolvedValue(pendingFriendship)

    await friendshipService.deleteFriendship('u1', 'u2')
    expect(mockRepo.deleteFriendship).toHaveBeenCalledWith('u1', 'u2')
  })

  it('throws when friendship does not exist', async () => {
    mockRepo.getFriendship.mockResolvedValue(null)
    await expect(friendshipService.deleteFriendship('u1', 'ghost')).rejects.toThrow(
      'Friendship not found'
    )
  })

  it('throws when userId is missing', async () => {
    await expect(friendshipService.deleteFriendship('', 'u2')).rejects.toThrow(
      'userId and friendId are required'
    )
  })
})
