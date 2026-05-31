import { logger } from '@utils/logger'
import { Request, Response } from 'express'
import { safeErrorMessage, errorStatus } from '@utils/errors'
import * as msgService from '@services/message.service'
import { sendToUsers } from '@/lib/ws'
import { getChatMemberIds } from '@/lib/chat-members'
import { AuthRequest } from '@middleware/auth.middleware'
import { ReactionType } from '@prisma/client'

export const getAllMessages = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params
    // req.query has already been coerced by validateQuery(getMessagesQuerySchema)
    const { limit, lastId } = req.query as unknown as {
      limit: number
      lastId: string
    }

    const messages = await msgService.getAllMessages(chatId, limit, lastId)
    res.status(200).json(messages)
  } catch (error) {
    const msg = safeErrorMessage(error)
    logger.error('request error', { err: error })
    res.status(errorStatus(msg)).json({ error: msg })
  }
}

export const createMessage = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params
    const userId = (req as AuthRequest).userId
    const { content, attachments = [], reactions = [] } = req.body
    // Stamp every reaction with the authenticated user — ignore any userId the
    // client may have included (stripped by the Zod schema).
    const stampedReactions = (reactions as { type: ReactionType }[]).map(
      (r) => ({
        ...r,
        userId
      })
    )

    const message = await msgService.createMessage(
      chatId,
      userId,
      content,
      attachments,
      stampedReactions
    )
    res.status(201).json(message)

    const memberIds = await getChatMemberIds(chatId)
    sendToUsers(memberIds, {
      type: 'message:created',
      payload: { ...message } as Record<string, unknown>
    })
  } catch (error) {
    const msg = safeErrorMessage(error)
    logger.error('request error', { err: error })
    res.status(errorStatus(msg)).json({ error: msg })
  }
}

export const updateMessage = async (req: Request, res: Response) => {
  try {
    const { chatId, messageId } = req.params
    const { content, attachments = [], reactions = [] } = req.body
    const message = await msgService.updateMessage(
      messageId,
      chatId,
      content,
      attachments,
      reactions
    )
    res.status(200).json(message)

    const memberIds = await getChatMemberIds(chatId)
    sendToUsers(memberIds, {
      type: 'message:updated',
      payload: { chatId, messageId, message }
    })
  } catch (error) {
    const msg = safeErrorMessage(error)
    logger.error('request error', { err: error })
    res.status(errorStatus(msg)).json({ error: msg })
  }
}

export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { chatId, messageId } = req.params
    const memberIds = await getChatMemberIds(chatId)
    await msgService.deleteMessage(messageId, chatId)
    res.status(204).send()

    sendToUsers(memberIds, {
      type: 'message:deleted',
      payload: { chatId, messageId }
    })
  } catch (error) {
    const msg = safeErrorMessage(error)
    logger.error('request error', { err: error })
    res.status(errorStatus(msg)).json({ error: msg })
  }
}
