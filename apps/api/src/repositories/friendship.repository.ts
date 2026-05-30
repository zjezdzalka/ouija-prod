import { prisma } from '@/lib'
import { FriendStatus } from '@prisma/client'

export const getFriendship = async (userId: string, friendId: string) => {
  return prisma.friendship.findUnique({
    where: { userId_friendId: { userId, friendId } }
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
  return prisma.friendship.update({
    where: { userId_friendId: { userId, friendId } },
    data: { status },
    include: { user: true, friend: true }
  })
}

export const deleteFriendship = async (userId: string, friendId: string) => {
  return prisma.friendship.delete({
    where: { userId_friendId: { userId, friendId } }
  })
}
