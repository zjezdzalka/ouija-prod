import { logger } from '@utils/logger'
import { Request, Response } from 'express'
import { safeErrorMessage, errorStatus } from '@utils/errors'
import * as userService from '@services/user.service'
import { AuthRequest } from '@middleware/auth.middleware'

export const getUsers = async (req: Request, res: Response) => {
  try {
    const { id, email, nickname, q } = req.query
    const requesterId = (req as AuthRequest).userId

    // Lookup by email is sensitive — only the owner of that email may query it.
    if (email) {
      const user = await userService.getUserByEmail(email as string)
      if (!user || user.id !== requesterId) {
        // Return 404 regardless of existence to prevent email enumeration.
        return res.status(404).json({ error: 'not found' })
      }
      return res.json(user)
    }

    // Single-user lookups return only the public profile shape (no email),
    // except when the requester is viewing their own profile.
    if (id) {
      const user = await userService.getUserById(id as string)
      if (!user) return res.status(404).json({ error: 'not found' })
      if (id === requesterId) {
        return res.json(user)
      }
      const { email: _email, ...publicProfile } = user as typeof user & { email?: string }
      void _email
      return res.json(publicProfile)
    }

    if (nickname) {
      const user = await userService.getUserByNickname(nickname as string)
      if (!user) return res.status(404).json({ error: 'not found' })
      const { email: _email, ...publicProfile } = user as typeof user & { email?: string }
      void _email
      return res.json(publicProfile)
    }

    // Search by query — returns public profile fields only (no email).
    if (q) return res.json(await userService.searchUsers(q as string))

    // Bare paginated list: restricted to admin use only.
    // Regular users have no legitimate reason to enumerate all accounts.
    // TODO: add an `isAdmin` flag to the User model; for now the endpoint is
    // disabled for all non-admin callers to close the enumeration surface.
    return res.status(403).json({
      error: 'forbidden: user listing requires admin privileges'
    })
  } catch (error) {
    const msg = safeErrorMessage(error)
    logger.error('request error', { err: error })
    res.status(errorStatus(msg)).json({ error: msg })
  }
}

export const createUser = async (req: Request, res: Response) => {
  try {
    const data: { email: string; password: string; nickname: string } = req.body
    const user = await userService.createUser(data)
    res.status(201).json(user)
  } catch (error) {
    const msg = safeErrorMessage(error)
    logger.error('request error', { err: error })
    res.status(errorStatus(msg)).json({ error: msg })
  }
}

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const requesterId = (req as AuthRequest).userId

    // Only allow users to modify their own profile
    if (id !== requesterId) {
      return res.status(403).json({ error: 'forbidden: you can only update your own profile' })
    }

    const data: Partial<{ nickname: string; password: string }> = req.body
    const user = await userService.updateUser(id, data)
    res.status(200).json(user)
  } catch (error) {
    const msg = safeErrorMessage(error)
    logger.error('request error', { err: error })
    res.status(errorStatus(msg)).json({ error: msg })
  }
}

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const requesterId = (req as AuthRequest).userId

    // Only allow users to delete their own account
    if (id !== requesterId) {
      return res.status(403).json({ error: 'forbidden: you can only delete your own account' })
    }

    await userService.deleteUser(id)
    res.status(204).send()
  } catch (error) {
    const msg = safeErrorMessage(error)
    logger.error('request error', { err: error })
    res.status(errorStatus(msg)).json({ error: msg })
  }
}
