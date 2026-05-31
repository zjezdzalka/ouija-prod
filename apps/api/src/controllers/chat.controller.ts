import { logger } from '@utils/logger'
import { Request, Response } from 'express'
import { safeErrorMessage, errorStatus } from '@utils/errors'
import * as chatService from '@services/chat.service'
import { ChatType, ChatRole } from '@prisma/client'
import { sendToUser, sendToUsers } from '@/lib/ws'
import { getChatMemberIds } from '@/lib/chat-members'
import { AuthRequest } from '@middleware/auth.middleware'
import { prisma } from '@/lib'

export const getChatById = async (req: Request, res: Response) => {
  try {
    const chat = await chatService.getChatById(req.params.chatId)
    res.status(200).json(chat)
  } catch (error) {
    const msg = safeErrorMessage(error)
    logger.error('request error', { err: error })
    res.status(errorStatus(msg)).json({ error: msg })
  }
}

export const getChatsByUserId = async (req: Request, res: Response) => {
  try {
    const chats = await chatService.getChatsByUserId(req.params.userId)
    res.status(200).json(chats)
  } catch (error) {
    const msg = safeErrorMessage(error)
    logger.error('request error', { err: error })
    res.status(errorStatus(msg)).json({ error: msg })
  }
}

export const createChat = async (req: Request, res: Response) => {
  try {
    const { name, type, userIds } = req.body
    const creatorId = (req as AuthRequest).userId

    // Guarantee the creator is always a member, deduplicating if they included themselves
    const memberIds: string[] = Array.from(new Set([creatorId, ...(userIds as string[])]))

    const chat = await chatService.createChat(name, type as ChatType, memberIds)
    res.status(201).json(chat)

    // Notify every member that a new chat was created (so their chat list updates)
    sendToUsers(memberIds, {
      type: 'chat:created',
      payload: { chat }
    })
  } catch (error) {
    const msg = safeErrorMessage(error)
    logger.error('request error', { err: error })
    res.status(errorStatus(msg)).json({ error: msg })
  }
}

export const updateChat = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params
    const data: Partial<{ name: string }> = req.body
    // Fetch members before update so we have them even if data changes
    const memberIds = await getChatMemberIds(chatId)
    const chat = await chatService.updateChat(chatId, data)
    res.status(200).json(chat)

    sendToUsers(memberIds, {
      type: 'chat:updated',
      payload: { chatId, chat }
    })
  } catch (error) {
    const msg = safeErrorMessage(error)
    logger.error('request error', { err: error })
    res.status(errorStatus(msg)).json({ error: msg })
  }
}

export const deleteChat = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params
    // Grab members before deletion — record won't exist after
    const memberIds = await getChatMemberIds(chatId)
    await chatService.deleteChat(chatId)
    res.status(204).send()

    sendToUsers(memberIds, {
      type: 'chat:deleted',
      payload: { chatId }
    })
  } catch (error) {
    const msg = safeErrorMessage(error)
    logger.error('request error', { err: error })
    res.status(errorStatus(msg)).json({ error: msg })
  }
}

// ChatUser

export const addUserToChat = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params
    const { userId, role } = req.body
    const chatUser = await chatService.addUserToChat(
      chatId,
      userId,
      role as ChatRole | undefined
    )
    res.status(201).json(chatUser)

    // Tell existing members someone joined; tell the new user they're now in this chat.
    // The new user doesn't have this chat in their sidebar yet, so sending chat:updated
    // would be a no-op for them. Instead send chat:created with the full chat object.
    const memberIds = await getChatMemberIds(chatId)
    const existingMemberIds = memberIds.filter((id) => id !== userId)
    sendToUsers(existingMemberIds, {
      type: 'chat:updated',
      payload: { chatId, event: 'member_added', userId }
    })
    const fullChat = await chatService.getChatById(chatId).catch(() => null)
    if (fullChat) {
      sendToUser(userId, {
        type: 'chat:created',
        payload: { chat: fullChat }
      })
    }
  } catch (error) {
    const msg = safeErrorMessage(error)
    logger.error('request error', { err: error })
    res.status(errorStatus(msg)).json({ error: msg })
  }
}

export const removeUserFromChat = async (req: Request, res: Response) => {
  try {
    const { chatId, userId } = req.params
    const requesterId = (req as AuthRequest).userId

    // A member may remove themselves (leave). Removing someone else requires ADMIN.
    if (userId !== requesterId) {
      const membership = await prisma.chatUser.findUnique({
        where: { chatId_userId: { chatId, userId: requesterId } }
      })
      if (!membership || membership.role !== ChatRole.ADMIN) {
        return res.status(403).json({ error: 'admin role required to remove other members' })
      }
    }

    // Snapshot members while the user is still in the chat
    const memberIds = await getChatMemberIds(chatId)
    await chatService.removeUserFromChat(chatId, userId)
    res.status(204).send()

    // Notify everyone (including the removed user, so they can navigate away)
    sendToUsers(memberIds, {
      type: 'chat:updated',
      payload: { chatId, event: 'member_removed', userId }
    })
  } catch (error) {
    const msg = safeErrorMessage(error)
    logger.error('request error', { err: error })
    res.status(errorStatus(msg)).json({ error: msg })
  }
}

export const updateChatUserRole = async (req: Request, res: Response) => {
  try {
    const { chatId, userId } = req.params
    const { role } = req.body
    const chatUser = await chatService.updateChatUserRole(
      chatId,
      userId,
      role as ChatRole
    )
    res.status(200).json(chatUser)

    // Only the affected user needs to know their role changed
    sendToUser(userId, {
      type: 'chat:updated',
      payload: { chatId, event: 'role_updated', role }
    })
  } catch (error) {
    const msg = safeErrorMessage(error)
    logger.error('request error', { err: error })
    res.status(errorStatus(msg)).json({ error: msg })
  }
}
