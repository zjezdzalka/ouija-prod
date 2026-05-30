import { Router } from 'express'
import * as msgController from '@controllers/message.controller'
import { requireAuth } from '@middleware/auth.middleware'

const msgRouter = Router()

msgRouter.get('/chats/:chatId/messages', requireAuth, msgController.getAllMessages)
msgRouter.post('/chats/:chatId/messages', requireAuth, msgController.createMessage)
msgRouter.put('/chats/:chatId/messages/:messageId', requireAuth, msgController.updateMessage)
msgRouter.delete('/chats/:chatId/messages/:messageId', requireAuth, msgController.deleteMessage)

export { msgRouter }
