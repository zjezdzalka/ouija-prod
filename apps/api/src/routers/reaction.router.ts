import { Router } from 'express'
import * as reactionController from '@controllers/reaction.controller'
import { requireAuth } from '@middleware/auth.middleware'

const reactionRouter = Router()

reactionRouter.get('/messages/:messageId/reactions', requireAuth, reactionController.getReactions)
reactionRouter.post('/messages/:messageId/reactions', requireAuth, reactionController.addReaction)
reactionRouter.put('/messages/:messageId/reactions/:userId', requireAuth, reactionController.updateReaction)
reactionRouter.delete('/messages/:messageId/reactions/:userId', requireAuth, reactionController.deleteReaction)

export { reactionRouter }
