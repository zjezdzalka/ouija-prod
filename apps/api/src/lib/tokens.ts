import { randomBytes } from 'crypto'
import { redis } from './redis'

const VERIFY_TTL_SECONDS = 60 * 60 * 24 // 24 hours
const RESET_TTL_SECONDS = 60 * 60 // 1 hour

const verifyKey = (token: string) => `verify:${token}`
const resetKey = (token: string) => `pwreset:${token}`

// ── Email verification ────────────────────────────────────────────────────────

export const createVerificationToken = async (
  userId: string
): Promise<string> => {
  const token = randomBytes(32).toString('hex')
  await redis.set(verifyKey(token), userId, { EX: VERIFY_TTL_SECONDS })
  return token
}

export const consumeVerificationToken = async (
  token: string
): Promise<string | null> => {
  const key = verifyKey(token)
  const userId = await redis.get(key)
  if (userId) await redis.del(key) // one-time use
  return userId
}

// ── Password reset ────────────────────────────────────────────────────────────

export const createPasswordResetToken = async (
  userId: string
): Promise<string> => {
  const token = randomBytes(32).toString('hex')
  await redis.set(resetKey(token), userId, { EX: RESET_TTL_SECONDS })
  return token
}

export const consumePasswordResetToken = async (
  token: string
): Promise<string | null> => {
  const key = resetKey(token)
  const userId = await redis.get(key)
  if (userId) await redis.del(key) // one-time use
  return userId
}


// ── Session tokens ─────────────────────────────────────────────────────────────

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days
const sessionKey = (token: string) => `session:${token}`
const sessionCreatedAtKey = (token: string) => `session:created:${token}`
const invalidatedAtKey = (userId: string) => `invalidated_at:${userId}`

export const createSessionToken = async (userId: string): Promise<string> => {
  const token = randomBytes(64).toString('hex')
  const now = Date.now()
  await redis.set(sessionKey(token), userId, { EX: SESSION_TTL_SECONDS })
  // Store creation timestamp so we can compare against invalidation time
  await redis.set(sessionCreatedAtKey(token), String(now), { EX: SESSION_TTL_SECONDS })
  return token
}

export const validateSessionToken = async (
  token: string
): Promise<string | null> => {
  const userId = await redis.get(sessionKey(token))
  if (!userId) return null

  // Check whether this session was created before a global invalidation (e.g. password change)
  const [createdAtStr, invalidatedAtStr] = await Promise.all([
    redis.get(sessionCreatedAtKey(token)),
    redis.get(invalidatedAtKey(userId))
  ])

  if (invalidatedAtStr && createdAtStr) {
    const createdAt = parseInt(createdAtStr, 10)
    const invalidatedAt = parseInt(invalidatedAtStr, 10)
    if (createdAt < invalidatedAt) {
      // Session pre-dates the invalidation — treat as expired
      await redis.del(sessionKey(token))
      await redis.del(sessionCreatedAtKey(token))
      return null
    }
  }

  return userId
}

export const deleteSessionToken = async (token: string): Promise<void> => {
  await redis.del(sessionKey(token))
  await redis.del(sessionCreatedAtKey(token))
}

/**
 * Invalidate all sessions for a user created before this moment.
 * Used after a password change or reset so stolen sessions can't be reused.
 * TTL matches the maximum session lifetime so the key doesn't linger forever.
 */
export const invalidateAllUserSessions = async (userId: string): Promise<void> => {
  await redis.set(invalidatedAtKey(userId), String(Date.now()), { EX: SESSION_TTL_SECONDS })
}
