import { prisma } from '@/lib'
import { ReactionType } from '@prisma/client'

export const getReactionsByMessage = async (messageId: string) => {
  return prisma.reaction.findMany({
    where: { messageId },
    include: { user: true }
  })
}

export const getReaction = async (messageId: string, userId: string) => {
  return prisma.reaction.findUnique({
    where: { messageId_userId: { messageId, userId } }
  })
}

export const createReaction = async (
  messageId: string,
  userId: string,
  type: ReactionType
) => {
  return prisma.reaction.create({ data: { messageId, userId, type } })
}

export const updateReaction = async (
  messageId: string,
  userId: string,
  type: ReactionType
) => {
  return prisma.reaction.update({
    where: { messageId_userId: { messageId, userId } },
    data: { type }
  })
}

export const deleteReaction = async (messageId: string, userId: string) => {
  return prisma.reaction.delete({
    where: { messageId_userId: { messageId, userId } }
  })
}
