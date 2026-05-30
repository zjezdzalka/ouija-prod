import { Router } from 'express'
import * as chatController from '@controllers/chat.controller'
import { requireAuth } from '@middleware/auth.middleware'

const chatRouter = Router()

chatRouter.get('/chats/:chatId', requireAuth, chatController.getChatById)
chatRouter.get('/users/:userId/chats', requireAuth, chatController.getChatsByUserId)
chatRouter.post('/chats', requireAuth, chatController.createChat)
chatRouter.put('/chats/:chatId', requireAuth, chatController.updateChat)
chatRouter.delete('/chats/:chatId', requireAuth, chatController.deleteChat)

chatRouter.post('/chats/:chatId/members', requireAuth, chatController.addUserToChat)
chatRouter.put('/chats/:chatId/members/:userId', requireAuth, chatController.updateChatUserRole)
chatRouter.delete('/chats/:chatId/members/:userId', requireAuth, chatController.removeUserFromChat)

export { chatRouter }
