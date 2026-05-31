import * as userRepo from '@repositories/user.repository'
import { emailService, tokenService, features } from '@/lib'
import { invalidateAllUserSessions } from '@/lib/tokens'
import { hashPassword } from '@utils/hash'
import { stripPassword } from '@services/session.service'

/**
 * Register a new user.
 *
 * If AUTH_REQUIRE_EMAIL_VERIFICATION=true the account is created with
 * emailVerified=false and a verification email is dispatched.
 * Otherwise the account is immediately active (emailVerified=true).
 */
export const register = async (data: {
  email: string
  password: string
  nickname: string
}) => {
  data.nickname = data.nickname.toLowerCase()
  data.email = data.email.toLowerCase().trim()

  if ((await userRepo.getUserByEmail(data.email)) !== null)
    throw new Error('email already exists')

  if ((await userRepo.getUserByNickname(data.nickname)) !== null)
    throw new Error('nickname already exists')

  const hashed = await hashPassword(data.password)

  if (features.REQUIRE_EMAIL_VERIFICATION) {
    // Create unverified account and send verification email
    const user = await userRepo.createUser({ ...data, password: hashed })
    const token = await tokenService.createVerificationToken(user.id)
    await emailService.sendVerificationEmail(user.email, token)
    return { user: stripPassword(user), requiresVerification: true }
  } else {
    // Create account already marked as verified — no email needed
    const user = await userRepo.createUser({
      ...data,
      password: hashed,
      emailVerified: true
    })
    return { user: stripPassword(user), requiresVerification: false }
  }
}

/**
 * Verify a user's email address using the token from the verification link.
 * Only relevant when AUTH_REQUIRE_EMAIL_VERIFICATION=true.
 */
export const verifyEmail = async (token: string) => {
  if (!features.REQUIRE_EMAIL_VERIFICATION)
    throw new Error('email verification is not enabled')

  if (!token) throw new Error('token is required')

  const userId = await tokenService.consumeVerificationToken(token)
  if (!userId) throw new Error('invalid or expired token')

  const user = await userRepo.getUserById(userId)
  if (!user) throw new Error('user not found')

  if (user.emailVerified) return user // already verified — idempotent

  return userRepo.updateUser(userId, { emailVerified: true })
}

/**
 * Initiate a password reset.
 * Only relevant when AUTH_ENABLE_PASSWORD_RESET=true.
 * Always returns silently to prevent user enumeration.
 */
export const forgotPassword = async (email: string) => {
  if (!features.ENABLE_PASSWORD_RESET)
    throw new Error('password reset is not enabled')

  const user = await userRepo.getUserByEmail(email)
  if (!user) return // silently no-op

  const token = await tokenService.createPasswordResetToken(user.id)
  await emailService.sendPasswordResetEmail(user.email, token)
}

/**
 * Complete a password reset using the token from the reset link.
 * Only relevant when AUTH_ENABLE_PASSWORD_RESET=true.
 */
export const resetPassword = async (token: string, newPassword: string) => {
  if (!features.ENABLE_PASSWORD_RESET)
    throw new Error('password reset is not enabled')

  const userId = await tokenService.consumePasswordResetToken(token)
  if (!userId) throw new Error('invalid or expired token')

  const user = await userRepo.getUserById(userId)
  if (!user) throw new Error('user not found')

  const hashed = await hashPassword(newPassword)
  await userRepo.updateUser(userId, { password: hashed })
  // Invalidate all existing sessions — a password reset means the account may have been compromised
  await invalidateAllUserSessions(userId)
}
