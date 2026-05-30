import * as msgPostgreRepo from '@repositories/message.repository'
import * as msgRedisRepo from '@repositories/message.repository.redis'
import { Attachment, Reaction } from '@prisma/client'

export const getAllMessages = async (
  chatId: string,
  limit: number,
  lastId: string // pusty string = od końca, cuid = paginacja kursorem
) => {
  const isInRedis = lastId
    ? await msgRedisRepo.findMessage(chatId, lastId)
    : null
  if (!lastId || !isInRedis) {
    return msgPostgreRepo.getAllMessages(chatId, limit, lastId)
  }
  return msgRedisRepo.getAllMessages(chatId)
}

export const createMessage = async (
  chatId: string,
  userId: string,
  content: string,
  attachments: Omit<Attachment, 'id' | 'messageId'>[],
  reactions: Omit<Reaction, 'messageId' | 'createdAt'>[]
) => {
  if (content == null && attachments.length === 0) {
    throw new Error('Content and attachments cannot both be empty')
  }

  // Zwracamy wiadomość żeby controller mógł ją odesłać klientowi (201)
  return msgPostgreRepo.createMessage(
    chatId,
    userId,
    content,
    attachments,
    reactions
  )
}

export const updateMessage = async (
  messageId: string,
  chatId: string,
  content: string,
  attachments: Omit<Attachment, 'id' | 'messageId'>[],
  reactions: Omit<Reaction, 'messageId' | 'createdAt'>[]
) => {
  const target = await msgPostgreRepo.findMessage(chatId, messageId)
  if (target == null) throw new Error('Record does not exist')

  return msgPostgreRepo.updateMessage(
    messageId,
    chatId,
    content,
    attachments,
    reactions
  )
}

export const deleteMessage = async (messageId: string, chatId: string) => {
  const target = await msgPostgreRepo.findMessage(chatId, messageId)
  if (target == null) throw new Error('Record does not exist')

  return msgPostgreRepo.deleteMessage(messageId, chatId)
}
