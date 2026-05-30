import { Router } from 'express'
import * as mediaController from '@controllers/media.controller'
import {
  uploadMiddleware,
  avatarMiddleware
} from '@middleware/upload.middleware'
import { requireAuth } from '@middleware/auth.middleware'

const mediaRouter = Router()

// Public: serve files (CDN — no auth needed to load images in browser)
mediaRouter.get('/:storedName', mediaController.serveFile)

// Protected: metadata and uploads require auth
mediaRouter.get('/info/:id', requireAuth, mediaController.getFileInfo)
mediaRouter.get('/user/:userId', requireAuth, mediaController.getUserFiles)
mediaRouter.post('/upload', requireAuth, uploadMiddleware, mediaController.uploadFiles)
mediaRouter.post('/avatar/:userId', requireAuth, avatarMiddleware, mediaController.uploadAvatar)
mediaRouter.delete('/avatar/:userId', requireAuth, mediaController.removeAvatar)
mediaRouter.delete('/:id', requireAuth, mediaController.deleteFile)

export { mediaRouter }
