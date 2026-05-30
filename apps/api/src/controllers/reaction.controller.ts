import { Request, Response } from 'express'
import * as reactionService from '@services/reaction.service'
import { ReactionType } from '@prisma/client'
import { sendToUsers } from '@/lib/ws'
import { getChatMemberIds } from '@/lib/chat-members'
import { prisma } from '@/lib'

/** Resolve chatId from messageId so we know who to notify */
async function getChatIdForMessage(messageId: string): Promise<string | null> {
  const msg = await prisma.message.findUnique({
    where: { id: messageId },
    select: { chatId: true }
  })
  return msg?.chatId ?? null
}

export const getReactions = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params
    const reactions = await reactionService.getReactionsByMessage(messageId)
    res.status(200).json(reactions)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export const addReaction = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params
    const { userId, type } = req.body
    const reaction = await reactionService.addReaction(
      messageId,
      userId,
      type as ReactionType
    )
    // Fetch user info to include in WS payload for tooltips
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true, avatarUrl: true }
    })
    res.status(201).json(reaction)

    const chatId = await getChatIdForMessage(messageId)
    if (chatId) {
      const memberIds = await getChatMemberIds(chatId)
      sendToUsers(memberIds, {
        type: 'reaction:added',
        payload: { chatId, messageId, reaction: { ...reaction, user } }
      })
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export const updateReaction = async (req: Request, res: Response) => {
  try {
    const { messageId, userId } = req.params
    const { type } = req.body
    const reaction = await reactionService.updateReaction(
      messageId,
      userId,
      type as ReactionType
    )
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true, avatarUrl: true }
    })
    res.status(200).json(reaction)

    const chatId = await getChatIdForMessage(messageId)
    if (chatId) {
      const memberIds = await getChatMemberIds(chatId)
      sendToUsers(memberIds, {
        type: 'reaction:updated',
        payload: { chatId, messageId, reaction: { ...reaction, user } }
      })
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export const deleteReaction = async (req: Request, res: Response) => {
  try {
    const { messageId, userId } = req.params
    const chatId = await getChatIdForMessage(messageId)
    const memberIds = chatId ? await getChatMemberIds(chatId) : []

    await reactionService.deleteReaction(messageId, userId)
    res.status(204).send()

    if (chatId && memberIds.length) {
      sendToUsers(memberIds, {
        type: 'reaction:deleted',
        payload: { chatId, messageId, userId }
      })
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}
