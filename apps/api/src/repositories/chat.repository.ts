import { prisma } from '@/lib'
import { ChatType, ChatRole } from '@prisma/client'

export const getChatById = async (chatId: string) => {
  return prisma.chat.findUnique({
    where: { id: chatId },
    include: { users: { include: { user: true } }, messages: false }
  })
}

export const getChatsByUserId = async (userId: string) => {
  return prisma.chat.findMany({
    where: { users: { some: { userId } } },
    include: {
      users: { include: { user: true } },
      messages: {
        orderBy: { sentAt: 'desc' },
        take: 1,
        include: { attachments: true, reactions: true }
      }
    }
  })
}

export const createChat = async (
  name: string | undefined,
  type: ChatType,
  userIds: string[]
) => {
  return prisma.chat.create({
    data: {
      name,
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
}

export const updateChat = async (
  chatId: string,
  data: Partial<{ name: string }>
) => {
  return prisma.chat.update({
    where: { id: chatId },
    data,
    include: { users: { include: { user: true } } }
  })
}

export const deleteChat = async (chatId: string) => {
  return prisma.chat.delete({ where: { id: chatId } })
}

// ChatUser helpers

export const addUserToChat = async (
  chatId: string,
  userId: string,
  role: ChatRole = ChatRole.MEMBER
) => {
  return prisma.chatUser.create({ data: { chatId, userId, role } })
}

export const removeUserFromChat = async (chatId: string, userId: string) => {
  return prisma.chatUser.delete({
    where: { chatId_userId: { chatId, userId } }
  })
}

export const updateChatUserRole = async (
  chatId: string,
  userId: string,
  role: ChatRole
) => {
  return prisma.chatUser.update({
    where: { chatId_userId: { chatId, userId } },
    data: { role }
  })
}

export const getChatUser = async (chatId: string, userId: string) => {
  return prisma.chatUser.findUnique({
    where: { chatId_userId: { chatId, userId } }
  })
}
