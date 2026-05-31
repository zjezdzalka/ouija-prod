import { Router } from 'express'
import * as userController from '@controllers/user.controller'
import { requireAuth } from '@middleware/auth.middleware'
import {
  validateBody,
  createUserSchema,
  updateUserSchema
} from '@middleware/validation.middleware'
import { Request, Response } from 'express'
import { tokenService } from '@/lib'
import { getUserById } from '@repositories/user.repository'
import { AuthRequest } from '@middleware/auth.middleware'
import * as userService from '@services/user.service'
import { UserStatus } from '@prisma/client'
import { safeErrorMessage, errorStatus } from '@utils/errors'
import { logger } from '@utils/logger'

const userRouter = Router()

// All user routes require authentication
userRouter.get('/', requireAuth, userController.getUsers)
userRouter.post('/', requireAuth, validateBody(createUserSchema), userController.createUser)
userRouter.put('/:id', requireAuth, validateBody(updateUserSchema), userController.updateUser)
userRouter.delete('/:id', requireAuth, userController.deleteUser)

/**
 * POST /api/users/beacon/status
 *
 * Dedicated endpoint for navigator.sendBeacon() calls on page unload.
 * sendBeacon cannot set custom headers, so the session token is passed as a
 * query parameter instead of the Authorization header.
 *
 * Only accepts status updates (used to set OFFLINE on tab close).
 */
userRouter.post('/users/beacon/status', async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string | undefined
    if (!token) {
      res.status(401).json({ error: 'token is required' })
      return
    }

    const userId = await tokenService.validateSessionToken(token)
    if (!userId) {
      res.status(401).json({ error: 'invalid or expired session' })
      return
    }

    const user = await getUserById(userId)
    if (!user) {
      res.status(401).json({ error: 'user no longer exists' })
      return
    }

    ;(req as AuthRequest).userId = userId

    const { status } = req.body as { status?: string }
    const allowed: UserStatus[] = ['ONLINE', 'OFFLINE', 'AWAY', 'BUSY', 'INVISIBLE']
    if (!status || !allowed.includes(status as UserStatus)) {
      res.status(400).json({ error: 'invalid status' })
      return
    }

    await userService.updateUser(userId, { status: status as UserStatus })
    res.status(204).send()
  } catch (error) {
    const msg = safeErrorMessage(error)
    logger.error('beacon error', { err: error })
    res.status(errorStatus(msg)).json({ error: msg })
  }
})

export { userRouter }
