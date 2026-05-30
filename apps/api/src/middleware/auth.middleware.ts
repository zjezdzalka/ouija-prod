import { Request, Response, NextFunction } from 'express'
import { tokenService } from '@/lib'
import { getUserById } from '@repositories/user.repository'

/**
 * Extends Express Request with the authenticated userId.
 * Set by requireAuth middleware after validating the session token.
 */
export interface AuthRequest extends Request {
  userId: string
}

/**
 * requireAuth
 *
 * Reads `Authorization: Bearer <token>` header, validates the session token
 * against Redis, and attaches `req.userId` to the request.
 *
 * Returns 401 if the header is missing, the token is invalid/expired,
 * or the user no longer exists in the database (e.g. after a DB reset).
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'authentication required' })
    return
  }

  const token = header.slice(7) // strip "Bearer "
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
  next()
}
