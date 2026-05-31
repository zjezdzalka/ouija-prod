import { Router } from 'express'
import * as msgController from '@controllers/message.controller'
import { requireAuth } from '@middleware/auth.middleware'
import { requireChatMember, requireMessageOwner } from '@middleware/chat.middleware'
import {
  validateBody,
  validateQuery,
  createMessageSchema,
  updateMessageSchema,
  getMessagesQuerySchema
} from '@middleware/validation.middleware'

const msgRouter = Router()

msgRouter.get(
  '/chats/:chatId/messages',
  requireAuth,
  requireChatMember,
  validateQuery(getMessagesQuerySchema),
  msgController.getAllMessages
)
msgRouter.post(
  '/chats/:chatId/messages',
  requireAuth,
  requireChatMember,
  validateBody(createMessageSchema),
  msgController.createMessage
)
msgRouter.put(
  '/chats/:chatId/messages/:messageId',
  requireAuth,
  requireChatMember,
  requireMessageOwner,
  validateBody(updateMessageSchema),
  msgController.updateMessage
)
msgRouter.delete(
  '/chats/:chatId/messages/:messageId',
  requireAuth,
  requireChatMember,
  requireMessageOwner,
  msgController.deleteMessage
)

export { msgRouter }
