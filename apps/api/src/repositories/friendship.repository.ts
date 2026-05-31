import { prisma } from '@/lib'
import { FriendStatus } from '@prisma/client'

export const getFriendship = async (userId: string, friendId: string) => {
  // Friendship records are stored with the requester as userId and recipient as friendId.
  // Look up both orderings so that either party can find the record regardless of who
  // originally sent the request.
  return prisma.friendship.findFirst({
    where: {
      OR: [
        { userId, friendId },
        { userId: friendId, friendId: userId }
      ]
    }
  })
}

export const getFriendships = async (userId: string) => {
  return prisma.friendship.findMany({
    where: {
      OR: [{ userId }, { friendId: userId }]
    },
    include: { user: true, friend: true }
  })
}

export const getFriendshipsByStatus = async (
  userId: string,
  status: FriendStatus
) => {
  return prisma.friendship.findMany({
    where: {
      OR: [{ userId }, { friendId: userId }],
      status
    },
    include: { user: true, friend: true }
  })
}

export const createFriendship = async (userId: string, friendId: string) => {
  return prisma.friendship.create({
    data: { userId, friendId, status: FriendStatus.PENDING },
    include: { user: true, friend: true }
  })
}

export const updateFriendshipStatus = async (
  userId: string,
  friendId: string,
  status: FriendStatus
) => {
  // Determine the canonical ordering (the one the record was created with).
  const existing = await getFriendship(userId, friendId)
  if (!existing) throw new Error('Friendship not found')
  return prisma.friendship.update({
    where: { userId_friendId: { userId: existing.userId, friendId: existing.friendId } },
    data: { status },
    include: { user: true, friend: true }
  })
}

export const deleteFriendship = async (userId: string, friendId: string) => {
  const existing = await getFriendship(userId, friendId)
  if (!existing) throw new Error('Friendship not found')
  return prisma.friendship.delete({
    where: { userId_friendId: { userId: existing.userId, friendId: existing.friendId } }
  })
}
