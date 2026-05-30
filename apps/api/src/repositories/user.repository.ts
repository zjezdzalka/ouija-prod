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

export const getUsers = async () => {
  return prisma.user.findMany()
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
  return prisma.user.create({ data })
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
