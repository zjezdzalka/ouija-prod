/**
 * Unit tests for user.service.ts
 */

import { jest } from '@jest/globals'
import * as userService from '@services/user.service'
import * as userRepo from '@repositories/user.repository'

jest.mock('@repositories/user.repository', () => ({
  getUserById: jest.fn(),
  getUserByEmail: jest.fn(),
  getUserByNickname: jest.fn(),
  getUsers: jest.fn(),
  searchUsers: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn()
}))

jest.mock('@services/media.service', () => ({
  rehydrateUser: jest.fn((u: unknown) => u)
}))

jest.mock('@services/session.service', () => ({
  stripPassword: jest.fn((u: Record<string, unknown>) => {
    return Object.fromEntries(
      Object.entries(u).filter(([key]) => key !== 'password')
    )
  })
}))

const mockRepo = userRepo as jest.Mocked<typeof userRepo>

const baseUser = {
  id: 'u1',
  email: 'alice@example.com',
  password: 'hashed',
  nickname: 'alice',
  status: 'ONLINE' as const,
  avatarUrl: null,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
}

beforeEach(() => jest.clearAllMocks())

// ── getUserById ───────────────────────────────────────────────────────────────

describe('userService.getUserById', () => {
  it('returns user without password', async () => {
    mockRepo.getUserById.mockResolvedValue(baseUser)
    const user = await userService.getUserById('u1')
    expect(user).not.toHaveProperty('password')
    expect(user?.id).toBe('u1')
  })

  it('returns null for unknown id', async () => {
    mockRepo.getUserById.mockResolvedValue(null)
    const user = await userService.getUserById('ghost')
    expect(user).toBeNull()
  })

  it('throws when id is empty string', async () => {
    await expect(userService.getUserById('')).rejects.toThrow('id is required')
  })
})

// ── searchUsers ───────────────────────────────────────────────────────────────

describe('userService.searchUsers', () => {
  it('returns matching users without passwords', async () => {
    mockRepo.searchUsers.mockResolvedValue([baseUser])
    const users = await userService.searchUsers('ali')
    expect(users[0]).not.toHaveProperty('password')
  })

  it('throws when query is empty', async () => {
    await expect(userService.searchUsers('')).rejects.toThrow('query is required')
  })

  it('trims the query before passing to repo', async () => {
    mockRepo.searchUsers.mockResolvedValue([])
    await userService.searchUsers('  alice  ')
    expect(mockRepo.searchUsers).toHaveBeenCalledWith('alice')
  })
})

// ── createUser ────────────────────────────────────────────────────────────────

describe('userService.createUser', () => {
  it('creates a new user', async () => {
    mockRepo.getUserByEmail.mockResolvedValue(null)
    mockRepo.createUser.mockResolvedValue(baseUser)
    const user = await userService.createUser({ email: 'alice@example.com', password: 'pw', nickname: 'alice' })
    expect(user).not.toHaveProperty('password')
  })

  it('throws when email already taken', async () => {
    mockRepo.getUserByEmail.mockResolvedValue(baseUser)
    await expect(
      userService.createUser({ email: 'alice@example.com', password: 'pw', nickname: 'alice' })
    ).rejects.toThrow('user already exists')
  })

  it('throws when data is incomplete', async () => {
    await expect(
      userService.createUser({ email: '', password: 'pw', nickname: 'alice' })
    ).rejects.toThrow('data is incomplete')
  })
})

// ── updateUser ────────────────────────────────────────────────────────────────

describe('userService.updateUser', () => {
  it('updates and returns user without password', async () => {
    mockRepo.getUserById.mockResolvedValue(baseUser)
    mockRepo.updateUser.mockResolvedValue({ ...baseUser, nickname: 'alice2' })

    const user = await userService.updateUser('u1', { nickname: 'alice2' })
    expect(user.nickname).toBe('alice2')
    expect(user).not.toHaveProperty('password')
  })

  it('throws when user does not exist', async () => {
    mockRepo.getUserById.mockResolvedValue(null)
    await expect(userService.updateUser('ghost', { nickname: 'x' })).rejects.toThrow(
      'user does not exist'
    )
  })

  it('throws when data is empty', async () => {
    await expect(userService.updateUser('u1', {})).rejects.toThrow('data is incomplete')
  })
})

// ── deleteUser ────────────────────────────────────────────────────────────────

describe('userService.deleteUser', () => {
  it('deletes an existing user', async () => {
    mockRepo.getUserById.mockResolvedValue(baseUser)
    mockRepo.deleteUser.mockResolvedValue(baseUser)
    await userService.deleteUser('u1')
    expect(mockRepo.deleteUser).toHaveBeenCalledWith('u1')
  })

  it('throws when user does not exist', async () => {
    mockRepo.getUserById.mockResolvedValue(null)
    await expect(userService.deleteUser('ghost')).rejects.toThrow('user does not exist')
  })
})
