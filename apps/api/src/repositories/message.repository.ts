import { prisma } from '@lib/prisma'
import * as redis from '@repositories/message.repository.redis'
import { Attachment, Reaction } from '@prisma/client'

export const findMessage = async (chatId: string, messageId: string) => {
  const target = await prisma.message.findFirst({
    where: { id: messageId, chatId }
  })
  if (!target) return null
  return target
}

export const getAllMessages = async (
  chatId: string,
  limit: number,
  lastId: string // pusty string oznacza "od końca"
) => {
  const messages = await prisma.message.findMany({
    where: {
      chatId,
      // Paginacja kursorem — jeśli lastId podane, weź starsze od niego
      id: lastId ? { lt: lastId } : undefined
    },
    take: limit,
    orderBy: { id: 'desc' },
    include: {
      attachments: true,
      reactions: {
        include: { user: { select: { nickname: true, avatarUrl: true } } }
      }
    }
  })

  if (messages.length > 0) {
    await redis.uploadMessages(chatId, messages)
  }

  return messages
}

export const createMessage = async (
  chatId: string,
  userId: string,
  content: string,
  attachments: Omit<Attachment, 'id' | 'messageId'>[],
  reactions: Omit<Reaction, 'messageId' | 'createdAt'>[]
) => {
  const message = await prisma.message.create({
    data: {
      chatId,
      senderId: userId,
      content,
      attachments: attachments.length
        ? { createMany: { data: attachments } }
        : undefined,
      reactions: reactions.length
        ? { createMany: { data: reactions } }
        : undefined
    },
    include: {
      attachments: true,
      reactions: {
        include: { user: { select: { nickname: true, avatarUrl: true } } }
      }
    }
  })
  await redis.uploadMessages(chatId, message)
  // Zwracaj wiadomość żeby controller mógł ją odesłać klientowi
  return message
}

export const updateMessage = async (
  messageId: string,
  chatId: string,
  content: string,
  attachments: Omit<Attachment, 'id' | 'messageId'>[],
  reactions: Omit<Reaction, 'messageId' | 'createdAt'>[]
) => {
  const message = await prisma.message.update({
    where: { id: messageId, chatId },
    data: {
      content,
      attachments: attachments.length
        ? { createMany: { data: attachments } }
        : undefined,
      reactions: reactions.length
        ? { createMany: { data: reactions } }
        : undefined
    }
  })
  await redis.updateMessage(chatId, messageId, message)
  return message
}

export const deleteMessage = async (messageId: string, chatId: string) => {
  await prisma.message.delete({
    where: { id: messageId, chatId }
  })
  await redis.deleteMessage(chatId, messageId)
}
