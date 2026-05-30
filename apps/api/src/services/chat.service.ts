import * as chatRepo from '@repositories/chat.repository'
import * as userRepo from '@repositories/user.repository'
import { ChatType, ChatRole } from '@prisma/client'
import { rehydrateUser } from '@services/media.service'

type ChatWithUsers = Awaited<ReturnType<typeof chatRepo.getChatById>>

function rehydrateChat(chat: ChatWithUsers) {
  if (!chat) return chat
  return {
    ...chat,
    users: chat.users.map((cu) => ({ ...cu, user: rehydrateUser(cu.user) }))
  }
}

export const getChatById = async (chatId: string) => {
  if (!chatId) throw new Error('chatId is required')
  const chat = await chatRepo.getChatById(chatId)
  if (!chat) throw new Error('Chat not found')
  return rehydrateChat(chat)
}

export const getChatsByUserId = async (userId: string) => {
  if (!userId) throw new Error('userId is required')
  if (!(await userRepo.getUserById(userId))) throw new Error('User not found')
  const chats = await chatRepo.getChatsByUserId(userId)
  return chats.map(rehydrateChat)
}

export const createChat = async (
  name: string | undefined,
  type: ChatType,
  userIds: string[]
) => {
  if (!type) throw new Error('type is required')
  if (!userIds || userIds.length < 2)
    throw new Error('At least two users are required')
  if (type === ChatType.GROUP && !name)
    throw new Error('Group chats require a name')
  for (const uid of userIds) {
    if (!(await userRepo.getUserById(uid)))
      throw new Error(`User ${uid} not found`)
  }
  const chat = await chatRepo.createChat(name, type, userIds)
  return rehydrateChat(chat)
}

export const updateChat = async (
  chatId: string,
  data: Partial<{ name: string; type: ChatType }>
) => {
  if (!chatId) throw new Error('chatId is required')
  if (Object.keys(data).length === 0) throw new Error('No update data provided')
  if (!(await chatRepo.getChatById(chatId))) throw new Error('Chat not found')
  return chatRepo.updateChat(chatId, data)
}

export const deleteChat = async (chatId: string) => {
  if (!chatId) throw new Error('chatId is required')
  if (!(await chatRepo.getChatById(chatId))) throw new Error('Chat not found')
  return chatRepo.deleteChat(chatId)
}

// ChatUser

export const addUserToChat = async (
  chatId: string,
  userId: string,
  role: ChatRole = ChatRole.MEMBER
) => {
  if (!chatId || !userId) throw new Error('chatId and userId are required')
  if (!(await chatRepo.getChatById(chatId))) throw new Error('Chat not found')
  if (!(await userRepo.getUserById(userId))) throw new Error('User not found')
  if (await chatRepo.getChatUser(chatId, userId))
    throw new Error('User already in chat')
  return chatRepo.addUserToChat(chatId, userId, role)
}

export const removeUserFromChat = async (chatId: string, userId: string) => {
  if (!chatId || !userId) throw new Error('chatId and userId are required')
  if (!(await chatRepo.getChatUser(chatId, userId)))
    throw new Error('User is not in this chat')
  return chatRepo.removeUserFromChat(chatId, userId)
}

export const updateChatUserRole = async (
  chatId: string,
  userId: string,
  role: ChatRole
) => {
  if (!chatId || !userId || !role)
    throw new Error('chatId, userId and role are required')
  if (!(await chatRepo.getChatUser(chatId, userId)))
    throw new Error('User is not in this chat')
  return chatRepo.updateChatUserRole(chatId, userId, role)
}
