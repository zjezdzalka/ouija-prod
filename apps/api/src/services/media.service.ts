import path from 'path'
import fs from 'fs'
import * as mediaRepo from '@repositories/media.repository'
import * as userRepo from '@repositories/user.repository'
import { UPLOAD_DIR } from '@middleware/upload.middleware'
import { MediaPurpose } from '@prisma/client'

// ─── Base URL helper ───────────────────────────────────────────────────────────
// In production set the CDN_BASE_URL env variable to the public hostname.
// Read dynamically (not at module load time) so that env vars injected after
// the module is first imported (e.g. via dotenv in tests or container secrets)
// are always picked up without requiring a process restart.
const getBaseUrl = () => process.env.CDN_BASE_URL ?? 'http://localhost:3001'

/** Full URL used in API responses so clients can fetch the file directly. */
const buildUrl = (storedName: string) => `${getBaseUrl()}/${storedName}`

/** Rehydrate a DB record — url column stores just the storedName. */
function withFullUrl<T extends { url: string; storedName: string }>(
  record: T
): T {
  return { ...record, url: buildUrl(record.storedName) }
}

/**
 * Rehydrate a user record's avatarUrl from a bare storedName to a full URL.
 * Safe to call with any user-shaped object — if avatarUrl is null or already
 * absolute it is returned unchanged.
 */
export function rehydrateUser<T extends { avatarUrl?: string | null }>(
  user: T
): T {
  if (!user.avatarUrl) return user
  if (
    user.avatarUrl.startsWith('http://') ||
    user.avatarUrl.startsWith('https://')
  )
    return user
  // Strip any legacy path prefix so we always work from the bare storedName
  const storedName = user.avatarUrl.split('/').pop()!
  return { ...user, avatarUrl: buildUrl(storedName) }
}

// ─── Upload a file ─────────────────────────────────────────────────────────────
export const uploadFile = async (
  ownerId: string,
  file: Express.Multer.File,
  purpose: MediaPurpose = MediaPurpose.ATTACHMENT
) => {
  if (!ownerId || !file) throw new Error('ownerId and file are required')

  const owner = await userRepo.getUserById(ownerId)
  if (!owner) throw new Error('user does not exist')

  const storedName = path.basename(file.path)

  const record = await mediaRepo.createMediaFile({
    ownerId,
    filename: file.originalname,
    storedName,
    mimeType: file.mimetype,
    size: file.size,
    purpose,
    url: storedName // store just the filename — rehydrated to full URL on read
  })

  return withFullUrl(record)
}

// ─── Upload avatar + update User.avatarUrl ─────────────────────────────────────
export const uploadAvatar = async (
  userId: string,
  file: Express.Multer.File
) => {
  // Create the DB record (url stored as path)
  const media = await uploadFile(userId, file, MediaPurpose.AVATAR)

  // Store just the storedName on the user row — rehydrated to full URL on read
  const user = await mediaRepo.setUserAvatar(userId, media.storedName)

  return { media, user }
}

// ─── Remove avatar ─────────────────────────────────────────────────────────────
export const removeAvatar = async (userId: string) => {
  const owner = await userRepo.getUserById(userId)
  if (!owner) throw new Error('user does not exist')

  if (!owner.avatarUrl) throw new Error('user has no avatar')

  // avatarUrl now stores just the storedName (e.g. "abc123.jpg")
  const storedName = owner.avatarUrl.split('/').pop()!
  const mediaFile = await mediaRepo.getMediaFileByStoredName(storedName)

  if (mediaFile) {
    await deleteMediaFile(mediaFile.id, userId)
  }

  // Unset the avatar URL on the user
  return mediaRepo.setUserAvatar(userId, null)
}

// ─── Get files for a user ──────────────────────────────────────────────────────
export const getFilesByUser = async (
  ownerId: string,
  purpose?: MediaPurpose
) => {
  if (!ownerId) throw new Error('ownerId is required')
  const owner = await userRepo.getUserById(ownerId)
  if (!owner) throw new Error('user does not exist')

  const files = await mediaRepo.getMediaFilesByOwner(ownerId, purpose)
  return files.map(withFullUrl)
}

// ─── Get single file metadata ──────────────────────────────────────────────────
export const getFileById = async (id: string) => {
  if (!id) throw new Error('id is required')
  const file = await mediaRepo.getMediaFileById(id)
  if (!file) throw new Error('file not found')
  return withFullUrl(file)
}

// ─── Delete a media file ───────────────────────────────────────────────────────
export const deleteMediaFile = async (id: string, requesterId: string) => {
  const file = await mediaRepo.getMediaFileById(id)
  if (!file) throw new Error('file not found')
  if (file.ownerId !== requesterId)
    throw new Error('forbidden: you do not own this file')

  // Delete from disk
  const filePath = path.join(UPLOAD_DIR, file.storedName)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

  // Remove DB record
  return mediaRepo.deleteMediaFile(id)
}
