/**
 * Unit tests for auth.service.ts
 *
 * All external collaborators (repositories, tokenService, emailService,
 * features, hashPassword) are mocked so these tests run without a DB or Redis.
 */

import { jest } from '@jest/globals'
import * as authService from '@services/auth.service'
import * as userRepo from '@repositories/user.repository'
import { hashPassword } from '@utils/hash'
import { emailService, features, tokenService } from '@/lib'

// ── Mock all external modules before importing the service ────────────────────

jest.mock('@repositories/user.repository', () => ({
  getUserByEmail: jest.fn(),
  getUserByNickname: jest.fn(),
  getUserById: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn()
}))

jest.mock('@utils/hash', () => ({
  hashPassword: jest.fn()
}))

jest.mock('@/lib', () => ({
  features: {
    REQUIRE_EMAIL_VERIFICATION: false,
    ENABLE_PASSWORD_RESET: true
  },
  tokenService: {
    createVerificationToken: jest.fn(),
    consumeVerificationToken: jest.fn(),
    createPasswordResetToken: jest.fn(),
    consumePasswordResetToken: jest.fn()
  },
  emailService: {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn()
  }
}))

jest.mock('@services/session.service', () => ({
  stripPassword: jest.fn((u: Record<string, unknown>) => {
    return Object.fromEntries(
      Object.entries(u).filter(([key]) => key !== 'password')
    )
  })
}))

// ── Now import the service (after mocks are in place) ─────────────────────────

// typed mock helpers
const mockUserRepo = userRepo as jest.Mocked<typeof userRepo>
const mockHash = hashPassword as jest.MockedFunction<typeof hashPassword>
const mockTokenService = tokenService as jest.Mocked<typeof tokenService>
const mockEmailService = emailService as jest.Mocked<typeof emailService>

const baseUser = {
  id: 'user_001',
  email: 'alice@example.com',
  password: 'hashed_pw',
  nickname: 'alice',
  status: 'ONLINE' as const,
  avatarUrl: null,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ── register ──────────────────────────────────────────────────────────────────

describe('authService.register', () => {
  it('creates a user when email and nickname are available', async () => {
    mockUserRepo.getUserByEmail.mockResolvedValue(null)
    mockUserRepo.getUserByNickname.mockResolvedValue(null)
    mockHash.mockResolvedValue('hashed_pw')
    mockUserRepo.createUser.mockResolvedValue(baseUser)

    const result = await authService.register({
      email: 'alice@example.com',
      password: 'password123',
      nickname: 'Alice'
    })

    expect(mockUserRepo.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'alice@example.com', nickname: 'alice' })
    )
    expect(result.requiresVerification).toBe(false)
    expect(result.user).not.toHaveProperty('password')
  })

  it('normalises nickname to lowercase', async () => {
    mockUserRepo.getUserByEmail.mockResolvedValue(null)
    mockUserRepo.getUserByNickname.mockResolvedValue(null)
    mockHash.mockResolvedValue('hashed_pw')
    mockUserRepo.createUser.mockResolvedValue(baseUser)

    await authService.register({ email: 'x@x.com', password: 'password123', nickname: 'ALICE' })

    expect(mockUserRepo.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ nickname: 'alice' })
    )
  })

  it('throws when email already exists', async () => {
    mockUserRepo.getUserByEmail.mockResolvedValue(baseUser)

    await expect(
      authService.register({ email: 'alice@example.com', password: 'password123', nickname: 'alice' })
    ).rejects.toThrow('email already exists')
  })

  it('throws when nickname already exists', async () => {
    mockUserRepo.getUserByEmail.mockResolvedValue(null)
    mockUserRepo.getUserByNickname.mockResolvedValue(baseUser)

    await expect(
      authService.register({ email: 'new@example.com', password: 'password123', nickname: 'alice' })
    ).rejects.toThrow('nickname already exists')
  })

  it('sends verification email and returns requiresVerification=true when flag is on', async () => {
    // Temporarily flip the feature flag
    ;(features as { REQUIRE_EMAIL_VERIFICATION: boolean }).REQUIRE_EMAIL_VERIFICATION = true

    mockUserRepo.getUserByEmail.mockResolvedValue(null)
    mockUserRepo.getUserByNickname.mockResolvedValue(null)
    mockHash.mockResolvedValue('hashed_pw')
    mockUserRepo.createUser.mockResolvedValue({ ...baseUser, emailVerified: false })
    mockTokenService.createVerificationToken.mockResolvedValue('verify_token')
    mockEmailService.sendVerificationEmail.mockResolvedValue(undefined)

    const result = await authService.register({
      email: 'alice@example.com',
      password: 'password123',
      nickname: 'alice'
    })

    expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
      'alice@example.com',
      'verify_token'
    )
    expect(result.requiresVerification).toBe(true)

    // Restore flag
    ;(features as { REQUIRE_EMAIL_VERIFICATION: boolean }).REQUIRE_EMAIL_VERIFICATION = false
  })
})

// ── verifyEmail ───────────────────────────────────────────────────────────────

describe('authService.verifyEmail', () => {
  beforeEach(() => {
    ;(features as { REQUIRE_EMAIL_VERIFICATION: boolean }).REQUIRE_EMAIL_VERIFICATION = true
  })
  afterEach(() => {
    ;(features as { REQUIRE_EMAIL_VERIFICATION: boolean }).REQUIRE_EMAIL_VERIFICATION = false
  })

  it('verifies a user successfully', async () => {
    mockTokenService.consumeVerificationToken.mockResolvedValue('user_001')
    mockUserRepo.getUserById.mockResolvedValue({ ...baseUser, emailVerified: false })
    mockUserRepo.updateUser.mockResolvedValue({ ...baseUser, emailVerified: true })

    await authService.verifyEmail('valid_token')

    expect(mockUserRepo.updateUser).toHaveBeenCalledWith('user_001', { emailVerified: true })
  })

  it('throws on invalid token', async () => {
    mockTokenService.consumeVerificationToken.mockResolvedValue(null)

    await expect(authService.verifyEmail('bad_token')).rejects.toThrow(
      'invalid or expired token'
    )
  })

  it('is idempotent for already-verified users', async () => {
    mockTokenService.consumeVerificationToken.mockResolvedValue('user_001')
    mockUserRepo.getUserById.mockResolvedValue(baseUser) // emailVerified: true

    const result = await authService.verifyEmail('valid_token')

    expect(mockUserRepo.updateUser).not.toHaveBeenCalled()
    expect(result).toEqual(baseUser)
  })

  it('throws when feature is disabled', async () => {
    ;(features as { REQUIRE_EMAIL_VERIFICATION: boolean }).REQUIRE_EMAIL_VERIFICATION = false

    await expect(authService.verifyEmail('any')).rejects.toThrow(
      'email verification is not enabled'
    )
  })
})

// ── forgotPassword ────────────────────────────────────────────────────────────

describe('authService.forgotPassword', () => {
  it('sends reset email for known address', async () => {
    mockUserRepo.getUserByEmail.mockResolvedValue(baseUser)
    mockTokenService.createPasswordResetToken.mockResolvedValue('reset_token')
    mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined)

    await authService.forgotPassword('alice@example.com')

    expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
      'alice@example.com',
      'reset_token'
    )
  })

  it('silently no-ops for unknown address (prevents user enumeration)', async () => {
    mockUserRepo.getUserByEmail.mockResolvedValue(null)

    await authService.forgotPassword('ghost@example.com')

    expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('throws when feature is disabled', async () => {
    ;(features as { ENABLE_PASSWORD_RESET: boolean }).ENABLE_PASSWORD_RESET = false

    await expect(authService.forgotPassword('x@x.com')).rejects.toThrow(
      'password reset is not enabled'
    )
    ;(features as { ENABLE_PASSWORD_RESET: boolean }).ENABLE_PASSWORD_RESET = true
  })
})

// ── resetPassword ─────────────────────────────────────────────────────────────

describe('authService.resetPassword', () => {
  it('updates password on valid token', async () => {
    mockTokenService.consumePasswordResetToken.mockResolvedValue('user_001')
    mockUserRepo.getUserById.mockResolvedValue(baseUser)
    mockHash.mockResolvedValue('new_hashed_pw')
    mockUserRepo.updateUser.mockResolvedValue({ ...baseUser, password: 'new_hashed_pw' })

    await authService.resetPassword('valid_token', 'newpassword123')

    expect(mockUserRepo.updateUser).toHaveBeenCalledWith('user_001', {
      password: 'new_hashed_pw'
    })
  })

  it('throws on invalid token', async () => {
    mockTokenService.consumePasswordResetToken.mockResolvedValue(null)

    await expect(authService.resetPassword('bad', 'newpassword123')).rejects.toThrow(
      'invalid or expired token'
    )
  })
})
