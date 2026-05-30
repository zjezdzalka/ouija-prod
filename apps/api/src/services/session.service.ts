import * as userRepo from '@repositories/user.repository'
import { tokenService, features } from '@/lib'
import { sha256 } from '@utils/hash'
import { rehydrateUser } from '@services/media.service'

/** Strip password hash before sending user data to clients. */
export function stripPassword<T extends Record<string, unknown>>(
  user: T
): Omit<T, 'password'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _pw, ...safe } = user as T & { password?: unknown }
  return safe as Omit<T, 'password'>
}

export const login = async (nickname: string, password: string) => {
  if (!nickname || !password)
    throw new Error('nickname and password are required')

  const user = await userRepo.getUserByNickname(nickname.toLowerCase())
  if (!user) throw new Error('invalid credentials')

  if (sha256(password) !== user.password) throw new Error('invalid credentials')

  if (features.REQUIRE_EMAIL_VERIFICATION && !user.emailVerified) {
    throw new Error('email not verified')
  }

  const token = await tokenService.createSessionToken(user.id)
  return { token, user: stripPassword(rehydrateUser(user)) }
}

export const logout = async (token: string) => {
  await tokenService.deleteSessionToken(token)
}
