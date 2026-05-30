import { FileFilterCallback } from 'multer'
import * as multer from 'multer'
import * as path from 'path'
import * as fs from 'fs'
import { randomUUID } from 'crypto'
import { Request } from 'express'

// ─── Upload directory ──────────────────────────────────────────────────────────
// Resolved relative to CWD so it works in both dev and Docker.
export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads')

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

// ─── Allowed MIME types ────────────────────────────────────────────────────────
const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'audio/mpeg': '.mp3',
  'audio/ogg': '.ogg',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'text/markdown': '.md',
  'text/x-log': '.log',
  'application/json': '.json',
  'application/zip': '.zip'
}

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

// ─── Storage engine ────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = ALLOWED_MIME[file.mimetype] ?? path.extname(file.originalname)
    cb(null, `${randomUUID()}${ext}`)
  }
})

// ─── File filter ───────────────────────────────────────────────────────────────
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (ALLOWED_MIME[file.mimetype]) {
    cb(null, true)
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`))
  }
}

export const uploadMiddleware = multer
  .default({
    storage,
    fileFilter,
    limits: { fileSize: MAX_SIZE_BYTES }
  })
  .array('files', 5)

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export const avatarMiddleware = multer
  .default({
    storage,
    fileFilter: (
      _req: Request,
      file: Express.Multer.File,
      cb: FileFilterCallback
    ) => {
      if (AVATAR_TYPES.includes(file.mimetype)) {
        cb(null, true)
      } else {
        cb(new Error('Avatar must be an image (JPEG, PNG, WEBP or GIF)'))
      }
    },
    limits: { fileSize: 5 * 1024 * 1024 }
  })
  .single('avatar')
