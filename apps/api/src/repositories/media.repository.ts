import { prisma } from '@/lib'
import { MediaPurpose } from '@prisma/client'

export type CreateMediaInput = {
  ownerId: string
  filename: string
  storedName: string
  mimeType: string
  size: number
  purpose: MediaPurpose
  url: string
}

export const createMediaFile = async (data: CreateMediaInput) => {
  return prisma.mediaFile.create({ data })
}

export const getMediaFileById = async (id: string) => {
  return prisma.mediaFile.findUnique({ where: { id } })
}

export const getMediaFileByStoredName = async (storedName: string) => {
  return prisma.mediaFile.findFirst({ where: { storedName } })
}

export const getMediaFilesByOwner = async (
  ownerId: string,
  purpose?: MediaPurpose
) => {
  return prisma.mediaFile.findMany({
    where: { ownerId, ...(purpose ? { purpose } : {}) },
    orderBy: { createdAt: 'desc' }
  })
}

export const deleteMediaFile = async (id: string) => {
  return prisma.mediaFile.delete({ where: { id } })
}

// ─── User avatar helpers ───────────────────────────────────────────────────────

export const setUserAvatar = async (
  userId: string,
  avatarUrl: string | null
) => {
  return prisma.user.update({ where: { id: userId }, data: { avatarUrl } })
}
