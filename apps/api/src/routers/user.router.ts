import { Router } from 'express'
import * as userController from '@controllers/user.controller'
import { requireAuth } from '@middleware/auth.middleware'

const userRouter = Router()

// Public: search/lookup used during login flow and group member search
userRouter.get('/', userController.getUsers)

// Protected: mutations require a valid session
userRouter.post('/', requireAuth, userController.createUser)
userRouter.put('/:id', requireAuth, userController.updateUser)
userRouter.delete('/:id', requireAuth, userController.deleteUser)

export { userRouter }
