import { Request, Response } from 'express'
import * as msgService from '@services/message.service'
import { sendToUsers } from '@/lib/ws'
import { getChatMemberIds } from '@/lib/chat-members'

export const getAllMessages = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params
    const limit = parseInt((req.query.limit as string) ?? '50')
    const lastId = (req.query.lastId as string) ?? ''
    const messages = await msgService.getAllMessages(chatId, limit, lastId)
    res.status(200).json(messages)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export const createMessage = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params
    const { userId, content, attachments = [], reactions = [] } = req.body
    const message = await msgService.createMessage(
      chatId,
      userId,
      content,
      attachments,
      reactions
    )
    res.status(201).json(message)

    // Notify all chat members — spread message fields directly so the
    // frontend can cast payload straight to Message without unwrapping.
    const memberIds = await getChatMemberIds(chatId)
    sendToUsers(memberIds, {
      type: 'message:created',
      payload: { ...message } as Record<string, unknown>
    })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
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
    res.status(500).json({ error: (error as Error).message })
  }
}

export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { chatId, messageId } = req.params
    // Fetch members before deletion (record is gone after)
    const memberIds = await getChatMemberIds(chatId)
    await msgService.deleteMessage(messageId, chatId)
    res.status(204).send()

    sendToUsers(memberIds, {
      type: 'message:deleted',
      payload: { chatId, messageId }
    })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}
