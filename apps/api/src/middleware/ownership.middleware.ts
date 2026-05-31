import { Request, Response, NextFunction } from 'express'
import { AuthRequest } from './auth.middleware'

/**
 * requireSelf
 *
 * Ensures the authenticated user matches the :userId route param.
 * Prevents users from acting as other users on user-scoped routes
 * (friendships, chats by user, etc.).
 * Must be placed after requireAuth.
 */
export const requireSelf = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const sessionUserId = (req as AuthRequest).userId
  const { userId } = req.params

  if (userId && userId !== sessionUserId) {
    res.status(403).json({ error: 'forbidden: you can only perform this action for yourself' })
    return
  }

  next()
}
