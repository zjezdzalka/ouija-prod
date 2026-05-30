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

export const createSessionToken = async (userId: string): Promise<string> => {
  const token = randomBytes(64).toString('hex')
  await redis.set(sessionKey(token), userId, { EX: SESSION_TTL_SECONDS })
  return token
}

export const validateSessionToken = async (
  token: string
): Promise<string | null> => {
  return redis.get(sessionKey(token))
}

export const deleteSessionToken = async (token: string): Promise<void> => {
  await redis.del(sessionKey(token))
}
