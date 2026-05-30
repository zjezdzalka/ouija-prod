import * as friendshipRepo from '@repositories/friendship.repository'
import * as userRepo from '@repositories/user.repository'
import { FriendStatus } from '@prisma/client'
import { rehydrateUser } from '@services/media.service'

function rehydrateFriendship<
  T extends {
    user: { avatarUrl?: string | null }
    friend: { avatarUrl?: string | null }
  }
>(f: T): T {
  return { ...f, user: rehydrateUser(f.user), friend: rehydrateUser(f.friend) }
}

export const getFriendships = async (userId: string) => {
  if (!userId) throw new Error('userId is required')
  if (!(await userRepo.getUserById(userId))) throw new Error('User not found')
  const friendships = await friendshipRepo.getFriendships(userId)
  return friendships.map(rehydrateFriendship)
}

export const getFriendshipsByStatus = async (
  userId: string,
  status: FriendStatus
) => {
  if (!userId) throw new Error('userId is required')
  if (!status) throw new Error('status is required')
  if (!(await userRepo.getUserById(userId))) throw new Error('User not found')
  const friendships = await friendshipRepo.getFriendshipsByStatus(
    userId,
    status
  )
  return friendships.map(rehydrateFriendship)
}

export const sendFriendRequest = async (userId: string, friendId: string) => {
  if (!userId || !friendId) throw new Error('userId and friendId are required')
  if (userId === friendId) throw new Error('Cannot befriend yourself')
  if (!(await userRepo.getUserById(userId))) throw new Error('User not found')
  if (!(await userRepo.getUserById(friendId)))
    throw new Error('Friend not found')
  const existing = await friendshipRepo.getFriendship(userId, friendId)
  if (existing) throw new Error('Friendship already exists')
  return friendshipRepo.createFriendship(userId, friendId)
}

export const updateFriendshipStatus = async (
  userId: string,
  friendId: string,
  status: FriendStatus
) => {
  if (!userId || !friendId) throw new Error('userId and friendId are required')
  if (!status) throw new Error('status is required')
  const existing = await friendshipRepo.getFriendship(userId, friendId)
  if (!existing) throw new Error('Friendship not found')
  return friendshipRepo.updateFriendshipStatus(userId, friendId, status)
}

export const deleteFriendship = async (userId: string, friendId: string) => {
  if (!userId || !friendId) throw new Error('userId and friendId are required')
  const existing = await friendshipRepo.getFriendship(userId, friendId)
  if (!existing) throw new Error('Friendship not found')
  return friendshipRepo.deleteFriendship(userId, friendId)
}
