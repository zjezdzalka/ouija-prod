import * as reactionRepo from '@repositories/reaction.repository'
import { ReactionType } from '@prisma/client'

export const getReactionsByMessage = async (messageId: string) => {
  if (!messageId) throw new Error('messageId is required')
  return reactionRepo.getReactionsByMessage(messageId)
}

export const addReaction = async (
  messageId: string,
  userId: string,
  type: ReactionType
) => {
  if (!messageId || !userId || !type)
    throw new Error('messageId, userId and type are required')
  const existing = await reactionRepo.getReaction(messageId, userId)
  if (existing)
    throw new Error('Reaction already exists — use PUT to change it')
  return reactionRepo.createReaction(messageId, userId, type)
}

export const updateReaction = async (
  messageId: string,
  userId: string,
  type: ReactionType
) => {
  if (!messageId || !userId || !type)
    throw new Error('messageId, userId and type are required')
  if (!(await reactionRepo.getReaction(messageId, userId)))
    throw new Error('Reaction not found')
  return reactionRepo.updateReaction(messageId, userId, type)
}

export const deleteReaction = async (messageId: string, userId: string) => {
  if (!messageId || !userId)
    throw new Error('messageId and userId are required')
  if (!(await reactionRepo.getReaction(messageId, userId)))
    throw new Error('Reaction not found')
  return reactionRepo.deleteReaction(messageId, userId)
}
