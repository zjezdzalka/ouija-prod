import { Router } from 'express'
import * as friendshipController from '@controllers/friendship.controller'
import { requireAuth } from '@middleware/auth.middleware'

const friendshipRouter = Router()

friendshipRouter.get('/users/:userId/friends', requireAuth, friendshipController.getFriendships)
friendshipRouter.post('/users/:userId/friends', requireAuth, friendshipController.sendFriendRequest)
friendshipRouter.put('/users/:userId/friends/:friendId', requireAuth, friendshipController.updateFriendshipStatus)
friendshipRouter.delete('/users/:userId/friends/:friendId', requireAuth, friendshipController.deleteFriendship)

export { friendshipRouter }
