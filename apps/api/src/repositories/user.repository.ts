import { prisma } from '@/lib'
import { UserStatus } from '@prisma/client'

export const getUserById = async (id: string) => {
  return prisma.user.findUnique({ where: { id } })
}

export const getUserByEmail = async (email: string) => {
  return prisma.user.findUnique({ where: { email } })
}

export const getUserByNickname = async (nickname: string) => {
  return prisma.user.findUnique({ where: { nickname } })
}

export const getUsers = async (limit = 50, cursor?: string) => {
  return prisma.user.findMany({
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { id: 'asc' }
  })
}

export const searchUsers = async (query: string) => {
  return prisma.user.findMany({
    where: {
      nickname: {
        contains: query,
        mode: 'insensitive'
      }
    },
    select: {
      id: true,
      nickname: true,
      status: true,
      avatarUrl: true
    },
    take: 20
  })
}

export const createUser = async (data: {
  email: string
  password: string
  nickname: string
  emailVerified?: boolean
}) => {
  try {
    return await prisma.user.create({ data })
  } catch (err: unknown) {
    // Prisma unique constraint violation code
    if ((err as { code?: string }).code === 'P2002') {
      const field = (err as { meta?: { target?: string[] } }).meta?.target?.[0]
      if (field === 'email') throw new Error('email already exists')
      if (field === 'nickname') throw new Error('nickname already exists')
    }
    throw err
  }
}

export const updateUser = async (
  id: string,
  data: Partial<{
    nickname: string
    password: string
    status: UserStatus
    emailVerified: boolean
  }>
) => {
  return prisma.user.update({ where: { id }, data })
}

export const deleteUser = async (id: string) => {
  return prisma.user.delete({ where: { id } })
}
