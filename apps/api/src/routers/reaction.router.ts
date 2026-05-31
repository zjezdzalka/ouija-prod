import { Router } from 'express'
import * as reactionController from '@controllers/reaction.controller'
import { requireAuth } from '@middleware/auth.middleware'
import { requireChatMember } from '@middleware/chat.middleware'

const reactionRouter = Router()

// All reaction routes resolve the chatId from the messageId so requireChatMember
// can verify the caller is actually a member of the chat the message belongs to.
// Without this gate any authenticated user who guesses a messageId can read or
// write reactions on messages in chats they were never part of.
reactionRouter.get('/chats/:chatId/messages/:messageId/reactions', requireAuth, requireChatMember, reactionController.getReactions)
reactionRouter.post('/chats/:chatId/messages/:messageId/reactions', requireAuth, requireChatMember, reactionController.addReaction)
reactionRouter.put('/chats/:chatId/messages/:messageId/reactions', requireAuth, requireChatMember, reactionController.updateReaction)
reactionRouter.delete('/chats/:chatId/messages/:messageId/reactions', requireAuth, requireChatMember, reactionController.deleteReaction)

export { reactionRouter }
