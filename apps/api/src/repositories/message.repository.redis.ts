import { redis } from '@lib/redis'
import { Message } from '@prisma/client'

const CACHE_MAX_MESSAGES = 100

// Prefix all message-cache keys so they never collide with session:*, verify:*,
// pwreset:*, or any other key that Redis stores for this application.
const msgKey = (chatId: string) => `chat:messages:${chatId}`

const serialize = (m: Message) => JSON.stringify(m)
const deserialize = (m: string): Message => JSON.parse(m)

export const findMessage = async (chatId: string, messageId: string) => {
  const messages = await redis.lRange(msgKey(chatId), 0, -1)
  const target = messages.find((m) => deserialize(m).id === messageId)
  if (!target) return null
  return target
}

export const getAllMessages = async (chatId: string, limit?: number) => {
  const end = limit ? limit - 1 : -1
  const messages = await redis.lRange(msgKey(chatId), 0, end)
  return messages.map(deserialize)
}

export const uploadMessages = async (
  chatId: string,
  messages: Message | Message[]
) => {
  const normalized = (Array.isArray(messages) ? messages : [messages]).map(serialize)
  await redis.rPush(msgKey(chatId), normalized)
  // Cap the list so it never grows beyond CACHE_MAX_MESSAGES entries
  await redis.lTrim(msgKey(chatId), -CACHE_MAX_MESSAGES, -1)
  // Refresh TTL: evict the cache after 1 hour of inactivity
  await redis.expire(msgKey(chatId), 60 * 60)
}

export const updateMessage = async (
  chatId: string,
  messageId: string,
  updated: Message
) => {
  const messages = await redis.lRange(msgKey(chatId), 0, -1)
  const index = messages.findIndex((m) => deserialize(m).id === messageId)
  if (index === -1) return
  await redis.lSet(msgKey(chatId), index, serialize(updated))
}

export const deleteMessage = async (chatId: string, messageId: string) => {
  const target = await findMessage(chatId, messageId)
  if (!target)
    throw new Error(`Message ${messageId} not found in chat ${chatId}`)
  await redis.lRem(msgKey(chatId), 1, target)
}

export const clearChat = async (chatId: string) => {
  await redis.del(msgKey(chatId))
}
