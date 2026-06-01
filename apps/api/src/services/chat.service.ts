import * as chatRepo from '@repositories/chat.repository'
import * as userRepo from '@repositories/user.repository'
import { ChatType, ChatRole } from '@prisma/client'
import { rehydrateUser } from '@services/media.service'
import { prisma } from '@/lib'
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
  return chats.map((chat) => {
    const { messages, ...rest } = chat as typeof chat & { messages?: unknown[] }
    return {
      ...rehydrateChat(rest as Parameters<typeof rehydrateChat>[0]),
      lastMessage: Array.isArray(messages) && messages.length > 0 ? messages[0] : null
    }
  })
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
  // PRIVATE = 1-to-1 direct chat; must have exactly 2 members
  if (type === ChatType.PRIVATE && userIds.length !== 2)
    throw new Error('Private chats must have exactly two members')
  for (const uid of userIds) {
    if (!(await userRepo.getUserById(uid)))
      throw new Error(`User ${uid} not found`)
  }

  // Prevent duplicate PRIVATE (1-to-1) chats between the same two users.
  //
  // Strategy: run the findFirst and create inside a serializable transaction so
  // two concurrent requests cannot both pass the existence check.  If the DB
  // partial unique index (migration 20240101000000) fires despite the app-level
  // guard (e.g. a race between two processes), the P2002 unique-constraint error
  // is caught and we fall back to returning the existing chat — same idempotent
  // outcome, no duplicate created.
  if (type === ChatType.PRIVATE) {
    const [a, b] = userIds
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const existing = await tx.chat.findFirst({
            where: {
              type: ChatType.PRIVATE,
              users: { some: { userId: a } },
              AND: [{ users: { some: { userId: b } } }]
            },
            include: { users: { include: { user: true } } }
          })
          if (existing) return { chat: existing, created: false }

          const created = await tx.chat.create({
            data: {
              name: undefined,
              type,
              users: {
                createMany: {
                  data: userIds.map((userId, i) => ({
                    userId,
                    role: i === 0 ? ChatRole.ADMIN : ChatRole.MEMBER
                  }))
                }
              }
            },
            include: { users: { include: { user: true } } }
          })
          return { chat: created, created: true }
        },
        { isolationLevel: 'Serializable' }
      )
      return rehydrateChat(result.chat)
    } catch (err: unknown) {
      // DB-level unique constraint violation from the partial index — another
      // concurrent transaction already created this chat; fetch and return it.
      if ((err as { code?: string }).code === 'P2002') {
        const existing = await prisma.chat.findFirst({
          where: {
            type: ChatType.PRIVATE,
            users: { some: { userId: a } },
            AND: [{ users: { some: { userId: b } } }]
          },
          include: { users: { include: { user: true } } }
        })
        if (existing) return rehydrateChat(existing)
      }
      throw err
    }
  }

  const chat = await chatRepo.createChat(name, type, userIds)
  return rehydrateChat(chat)
}

export const updateChat = async (
  chatId: string,
  data: Partial<{ name: string }>
) => {
  if (!chatId) throw new Error('chatId is required')
  if (Object.keys(data).length === 0) throw new Error('No update data provided')
  if (!(await chatRepo.getChatById(chatId))) throw new Error('Chat not found')
  // type is intentionally not updatable — strip it defensively even if somehow
  // passed through, to prevent PRIVATE→GROUP promotion attacks.
  const { name } = data
  const updated = await chatRepo.updateChat(chatId, { name })
  return rehydrateChat(updated)
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
