import { logger } from '@utils/logger'
import { Request, Response } from 'express'
import { safeErrorMessage, errorStatus } from '@utils/errors'
import path from 'path'
import fs from 'fs'
import * as mediaService from '@services/media.service'
import { UPLOAD_DIR } from '@middleware/upload.middleware'
import { MediaPurpose } from '@prisma/client'
import { AuthRequest } from '@middleware/auth.middleware'

// ─── POST /api/media/upload ────────────────────────────────────────────────────
// Body (multipart/form-data): files[]
// ownerId is derived from the authenticated session — never trusted from the client.
export const uploadFiles = async (req: Request, res: Response) => {
  try {
    const ownerId = (req as AuthRequest).userId
    const files = req.files as Express.Multer.File[]

    if (!files || files.length === 0)
      return res.status(400).json({ error: 'No files were uploaded' })

    const results = await Promise.all(
      files.map((file) =>
        mediaService.uploadFile(ownerId, file, MediaPurpose.ATTACHMENT)
      )
    )

    res.status(201).json(results)
  } catch (error) {
    const msg = safeErrorMessage(error)
    logger.error('request error', { err: error })
    res.status(errorStatus(msg)).json({ error: msg })
  }
}

// ─── POST /api/media/avatar/:userId ───────────────────────────────────────────
// Body (multipart/form-data): avatar (single image)
export const uploadAvatar = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const requesterId = (req as AuthRequest).userId

    if (userId !== requesterId) {
      return res.status(403).json({ error: 'forbidden: you can only update your own avatar' })
    }

    const file = req.file as Express.Multer.File | undefined

    if (!file)
      return res.status(400).json({ error: 'No avatar file was uploaded' })

    const result = await mediaService.uploadAvatar(userId, file)
    res.status(201).json(result)
  } catch (error) {
    const msg = safeErrorMessage(error)
    logger.error('request error', { err: error })
    res.status(errorStatus(msg)).json({ error: msg })
  }
}

// ─── DELETE /api/media/avatar/:userId ─────────────────────────────────────────
export const removeAvatar = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const requesterId = (req as AuthRequest).userId

    if (userId !== requesterId) {
      return res.status(403).json({ error: 'forbidden: you can only remove your own avatar' })
    }

    const user = await mediaService.removeAvatar(userId)
    res.status(200).json(user)
  } catch (error) {
    const msg = safeErrorMessage(error)
    logger.error('request error', { err: error })
    res.status(errorStatus(msg)).json({ error: msg })
  }
}

// ─── GET /api/media/:storedName ────────────────────────────────────────────────
// Serves the raw file from disk (CDN-style).
export const serveFile = async (req: Request, res: Response) => {
  try {
    const { storedName } = req.params

    // Prevent path traversal
    const safeName = path.basename(storedName)
    const filePath = path.join(UPLOAD_DIR, safeName)

    // Use async access instead of blocking existsSync
    await fs.promises.access(filePath, fs.constants.R_OK)

    // Let Express set content-type + enable browser caching (1 week)
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable')
    res.sendFile(filePath)
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT' || (error as NodeJS.ErrnoException).code === 'EACCES') {
      return res.status(404).json({ error: 'File not found' })
    }
    const msg = safeErrorMessage(error)
    logger.error('request error', { err: error })
    res.status(errorStatus(msg)).json({ error: msg })
  }
}

// ─── GET /api/media/info/:id ───────────────────────────────────────────────────
// Returns metadata for a single file. Restricted to the owner — file metadata
// (ownerId, filename, mimeType, size, url) is private information.
export const getFileInfo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const requesterId = (req as AuthRequest).userId
    const file = await mediaService.getFileById(id)
    if (file.ownerId !== requesterId) {
      return res.status(403).json({ error: 'forbidden: you do not own this file' })
    }
    res.status(200).json(file)
  } catch (error) {
    const msg = safeErrorMessage(error)
    logger.error('request error', { err: error })
    res.status(errorStatus(msg)).json({ error: msg })
  }
}

// ─── GET /api/media/user/:userId ──────────────────────────────────────────────
// Returns all media metadata owned by a user.
// Optional query: ?purpose=AVATAR | ATTACHMENT
// Restricted to the owner: file lists are private — another user has no
// legitimate reason to enumerate someone else's uploaded files.
export const getUserFiles = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const requesterId = (req as AuthRequest).userId

    if (userId !== requesterId) {
      return res.status(403).json({ error: 'forbidden: you can only list your own files' })
    }

    const { purpose } = req.query

    const files = await mediaService.getFilesByUser(
      userId,
      purpose as MediaPurpose | undefined
    )
    res.status(200).json(files)
  } catch (error) {
    const msg = safeErrorMessage(error)
    logger.error('request error', { err: error })
    res.status(errorStatus(msg)).json({ error: msg })
  }
}

// ─── DELETE /api/media/:id ─────────────────────────────────────────────────────
// Deletes the file from disk and DB.
// Ownership is enforced using the authenticated session user — not client-supplied requesterId.
export const deleteFile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const requesterId = (req as AuthRequest).userId

    await mediaService.deleteMediaFile(id, requesterId)
    res.status(204).send()
  } catch (error) {
    const msg = safeErrorMessage(error)
    logger.error('request error', { err: error })
    res.status(errorStatus(msg)).json({ error: msg })
  }
}
