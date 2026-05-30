import { redis } from '@lib/redis'
import { Message } from '@prisma/client'

const serialize = (m: Message) => JSON.stringify(m)
const deserialize = (m: string): Message => JSON.parse(m)

export const findMessage = async (chatId: string, messageId: string) => {
  const messages = await redis.lRange(chatId, 0, -1)
  const target = messages.find((m) => deserialize(m).id === messageId)
  if (!target) return null
  return target
}

export const getAllMessages = async (chatId: string) => {
  const messages = await redis.lRange(chatId, 0, -1)
  return messages.map(deserialize)
}

export const uploadMessages = async (
  chatId: string,
  messages: Message | Message[]
) => {
  const normalized = (Array.isArray(messages) ? messages : [messages]).map(
    serialize
  )
  await redis.rPush(chatId, normalized)
}

export const updateMessage = async (
  chatId: string,
  messageId: string,
  updated: Message
) => {
  const messages = await redis.lRange(chatId, 0, -1)
  const index = messages.findIndex((m) => deserialize(m).id === messageId)
  if (index === -1) return
  await redis.lSet(chatId, index, serialize(updated))
}

export const deleteMessage = async (chatId: string, messageId: string) => {
  const target = await findMessage(chatId, messageId)
  if (!target)
    throw new Error(`Message ${messageId} not found in chat ${chatId}`)
  await redis.lRem(chatId, 1, target)
}

export const clearChat = async (chatId: string) => {
  await redis.del(chatId)
}
