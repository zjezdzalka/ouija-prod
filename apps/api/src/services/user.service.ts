import * as userRepo from '@repositories/user.repository'
import { UserStatus } from '@prisma/client'
import { rehydrateUser } from '@services/media.service'
import { stripPassword } from '@services/session.service'
import { hashPassword } from '@utils/hash'
import { invalidateAllUserSessions } from '@/lib/tokens'

export const getUserById = async (id: string) => {
  if (!id) throw new Error('id is required')
  const user = await userRepo.getUserById(id)
  return user ? stripPassword(rehydrateUser(user)) : user
}

export const getUserByEmail = async (email: string) => {
  if (!email) throw new Error('email is required')
  const user = await userRepo.getUserByEmail(email)
  return user ? stripPassword(rehydrateUser(user)) : user
}

export const getUserByNickname = async (nickname: string) => {
  if (!nickname) throw new Error('nickname is required')
  const user = await userRepo.getUserByNickname(nickname)
  return user ? stripPassword(rehydrateUser(user)) : user
}

export const getUsers = async (limit = 50, cursor?: string) => {
  const users = await userRepo.getUsers(limit, cursor)
  return users.map((u) => stripPassword(rehydrateUser(u)))
}

export const searchUsers = async (query: string) => {
  if (!query || query.trim().length < 1) throw new Error('query is required')
  const users = await userRepo.searchUsers(query.trim())
  return users.map((u) => stripPassword(rehydrateUser(u)))
}

export const createUser = async (data: {
  email: string
  password: string
  nickname: string
}) => {
  if (!data.email || !data.password || !data.nickname)
    throw new Error('data is incomplete')
  if ((await userRepo.getUserByEmail(data.email)) !== null) {
    throw new Error('user already exists')
  }
  const user = await userRepo.createUser(data)
  return stripPassword(rehydrateUser(user))
}

export const updateUser = async (
  id: string,
  data: Partial<{
    nickname: string
    password: string
    status: UserStatus
    avatarUrl: string | null
  }>
) => {
  if (Object.keys(data).length === 0) throw new Error('data is incomplete')
  if ((await userRepo.getUserById(id)) === null) {
    throw new Error('user does not exist')
  }
  // Hash the new password before persisting — never store plaintext
  const hasNewPassword = !!data.password
  const toSave = hasNewPassword
    ? { ...data, password: await hashPassword(data.password!) }
    : data
  const user = await userRepo.updateUser(id, toSave)
  // If the password changed, force all other sessions to re-authenticate
  if (hasNewPassword) await invalidateAllUserSessions(id)
  return stripPassword(rehydrateUser(user))
}

export const deleteUser = async (id: string) => {
  if ((await userRepo.getUserById(id)) === null) {
    throw new Error('user does not exist')
  }
  return userRepo.deleteUser(id)
}
