import { Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import * as mediaService from '@services/media.service'
import { UPLOAD_DIR } from '@middleware/upload.middleware'
import { MediaPurpose } from '@prisma/client'

// ─── POST /api/media/upload ────────────────────────────────────────────────────
// Body (multipart/form-data): files[] + ownerId
export const uploadFiles = async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.body
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
    res.status(500).json({ error: (error as Error).message })
  }
}

// ─── POST /api/media/avatar/:userId ───────────────────────────────────────────
// Body (multipart/form-data): avatar (single image)
export const uploadAvatar = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const file = req.file as Express.Multer.File | undefined

    if (!file)
      return res.status(400).json({ error: 'No avatar file was uploaded' })

    const result = await mediaService.uploadAvatar(userId, file)
    res.status(201).json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

// ─── DELETE /api/media/avatar/:userId ─────────────────────────────────────────
export const removeAvatar = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const user = await mediaService.removeAvatar(userId)
    res.status(200).json(user)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

// ─── GET /api/media/:storedName ────────────────────────────────────────────────
// Serves the raw file from disk (CDN-style).
export const serveFile = (req: Request, res: Response) => {
  try {
    const { storedName } = req.params

    // Prevent path traversal
    const safeName = path.basename(storedName)
    const filePath = path.join(UPLOAD_DIR, safeName)

    if (!fs.existsSync(filePath))
      return res.status(404).json({ error: 'File not found' })

    // Let Express set content-type + enable browser caching (1 week)
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable')
    res.sendFile(filePath)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

// ─── GET /api/media/info/:id ───────────────────────────────────────────────────
// Returns metadata for a single file.
export const getFileInfo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const file = await mediaService.getFileById(id)
    res.status(200).json(file)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

// ─── GET /api/media/user/:userId ──────────────────────────────────────────────
// Returns all media metadata owned by a user.
// Optional query: ?purpose=AVATAR | ATTACHMENT
export const getUserFiles = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const { purpose } = req.query

    const files = await mediaService.getFilesByUser(
      userId,
      purpose as MediaPurpose | undefined
    )
    res.status(200).json(files)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

// ─── DELETE /api/media/:id ─────────────────────────────────────────────────────
// Deletes the file from disk and DB.
// Body: { requesterId } – the user performing the delete (must be the owner).
export const deleteFile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { requesterId } = req.body

    if (!requesterId)
      return res.status(400).json({ error: 'requesterId is required' })

    await mediaService.deleteMediaFile(id, requesterId)
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}
