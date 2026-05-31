/**
 * Unit tests for chat.service.ts
 */

import { jest } from '@jest/globals'

jest.mock('@repositories/chat.repository', () => ({
  getChatById: jest.fn(),
  getChatsByUserId: jest.fn(),
  createChat: jest.fn(),
  updateChat: jest.fn(),
  deleteChat: jest.fn(),
  addUserToChat: jest.fn(),
  removeUserFromChat: jest.fn(),
  updateChatUserRole: jest.fn(),
  getChatUser: jest.fn()
}))

jest.mock('@repositories/user.repository', () => ({
  getUserById: jest.fn()
}))

jest.mock('@services/media.service', () => ({
  rehydrateUser: jest.fn((u: unknown) => u)
}))

import * as chatService from '@services/chat.service'
import * as chatRepo from '@repositories/chat.repository'
import * as userRepo from '@repositories/user.repository'
import { ChatType, ChatRole } from '@prisma/client'
import { prisma } from '@/lib'

const mockChatRepo = chatRepo as unknown as jest.MockedObject<typeof chatRepo>
const mockUserRepo = userRepo as unknown as jest.MockedObject<typeof userRepo>

const user1 = {
  id: 'u1',
  nickname: 'alice',
  email: 'a@a.com',
  password: 'h',
  status: 'ONLINE' as const,
  avatarUrl: null,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
}
const user2 = {
  id: 'u2',
  nickname: 'bob',
  email: 'b@b.com',
  password: 'h',
  status: 'ONLINE' as const,
  avatarUrl: null,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
}

const privateChat = {
  id: 'chat1',
  name: null,
  type: ChatType.PRIVATE,
  avatarUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  users: [
    {
      chatId: 'chat1',
      userId: 'u1',
      role: ChatRole.ADMIN,
      joinedAt: new Date(),
      user: user1
    },
    {
      chatId: 'chat1',
      userId: 'u2',
      role: ChatRole.MEMBER,
      joinedAt: new Date(),
      user: user2
    }
  ]
}

beforeEach(() => jest.clearAllMocks())

// ── getChatById ───────────────────────────────────────────────────────────────

describe('chatService.getChatById', () => {
  it('returns chat', async () => {
    mockChatRepo.getChatById.mockResolvedValue(privateChat)
    const chat = await chatService.getChatById('chat1')
    expect(chat).not.toBeNull()
    expect(chat!.id).toBe('chat1')
  })

  it('throws when chat not found', async () => {
    mockChatRepo.getChatById.mockResolvedValue(null)
    await expect(chatService.getChatById('nope')).rejects.toThrow(
        'Chat not found'
    )
  })

  it('throws when chatId is empty', async () => {
    await expect(chatService.getChatById('')).rejects.toThrow(
        'chatId is required'
    )
  })
})

// ── createChat ────────────────────────────────────────────────────────────────

describe('chatService.createChat', () => {
  it('creates a private chat', async () => {
    mockUserRepo.getUserById
        .mockResolvedValue(user1)
        .mockResolvedValueOnce(user1)
        .mockResolvedValueOnce(user2)

    const transactionMock = prisma.$transaction as unknown as {
      mockImplementationOnce: (
          fn: (
              callback: (tx: {
                chat: {
                  findFirst: jest.Mock
                  create: jest.Mock
                }
              }) => unknown
          ) => Promise<unknown>
      ) => void
    }

    transactionMock.mockImplementationOnce(async (callback) => {
      const tx = {
        chat: {
          findFirst: jest.fn().mockResolvedValue(null as never),
          create: jest.fn().mockResolvedValue(privateChat as never)
        }
      }
      return callback(tx)
    })

    const chat = await chatService.createChat(undefined, ChatType.PRIVATE, [
      'u1',
      'u2'
    ])
    expect(chat).not.toBeNull()
    expect(chat!.type).toBe(ChatType.PRIVATE)
  })

  it('throws when fewer than 2 userIds', async () => {
    await expect(
        chatService.createChat(undefined, ChatType.PRIVATE, ['u1'])
    ).rejects.toThrow('At least two users are required')
  })

  it('throws when GROUP chat has no name', async () => {
    await expect(
        chatService.createChat(undefined, ChatType.GROUP, ['u1', 'u2', 'u3'])
    ).rejects.toThrow('Group chats require a name')
  })

  it('throws when a userId does not exist', async () => {
    mockUserRepo.getUserById
        .mockResolvedValueOnce(user1)
        .mockResolvedValueOnce(null)

    await expect(
        chatService.createChat(undefined, ChatType.PRIVATE, ['u1', 'ghost'])
    ).rejects.toThrow('User ghost not found')
  })
})

// ── updateChat ────────────────────────────────────────────────────────────────

describe('chatService.updateChat', () => {
  it('updates chat name', async () => {
    mockChatRepo.getChatById.mockResolvedValue(privateChat)
    mockChatRepo.updateChat.mockResolvedValue({
      ...privateChat,
      name: 'New Name'
    })

    await chatService.updateChat('chat1', { name: 'New Name' })
    expect(mockChatRepo.updateChat).toHaveBeenCalledWith('chat1', {
      name: 'New Name'
    })
  })

  it('throws when data is empty', async () => {
    await expect(chatService.updateChat('chat1', {})).rejects.toThrow(
        'No update data provided'
    )
  })

  it('throws when chat not found', async () => {
    mockChatRepo.getChatById.mockResolvedValue(null)
    await expect(chatService.updateChat('nope', { name: 'X' })).rejects.toThrow(
        'Chat not found'
    )
  })
})

// ── addUserToChat ─────────────────────────────────────────────────────────────

describe('chatService.addUserToChat', () => {
  it('adds a user', async () => {
    mockChatRepo.getChatById.mockResolvedValue(privateChat)
    mockUserRepo.getUserById.mockResolvedValue(user1)
    mockChatRepo.getChatUser.mockResolvedValue(null)
    mockChatRepo.addUserToChat.mockResolvedValue({
      chatId: 'chat1',
      userId: 'u3',
      role: ChatRole.MEMBER,
      joinedAt: new Date()
    })

    await chatService.addUserToChat('chat1', 'u3')
    expect(mockChatRepo.addUserToChat).toHaveBeenCalled()
  })

  it('throws when user already in chat', async () => {
    mockChatRepo.getChatById.mockResolvedValue(privateChat)
    mockUserRepo.getUserById.mockResolvedValue(user1)
    mockChatRepo.getChatUser.mockResolvedValue({
      chatId: 'chat1',
      userId: 'u1',
      role: ChatRole.MEMBER,
      joinedAt: new Date()
    })

    await expect(chatService.addUserToChat('chat1', 'u1')).rejects.toThrow(
        'User already in chat'
    )
  })
})

// ── removeUserFromChat ────────────────────────────────────────────────────────

describe('chatService.removeUserFromChat', () => {
  it('removes a user', async () => {
    mockChatRepo.getChatUser.mockResolvedValue({
      chatId: 'chat1',
      userId: 'u2',
      role: ChatRole.MEMBER,
      joinedAt: new Date()
    })
    mockChatRepo.removeUserFromChat.mockResolvedValue({
      chatId: 'chat1',
      userId: 'u2',
      role: ChatRole.MEMBER,
      joinedAt: new Date()
    })

    await chatService.removeUserFromChat('chat1', 'u2')
    expect(mockChatRepo.removeUserFromChat).toHaveBeenCalledWith('chat1', 'u2')
  })

  it('throws when user not in chat', async () => {
    mockChatRepo.getChatUser.mockResolvedValue(null)
    await expect(
        chatService.removeUserFromChat('chat1', 'ghost')
    ).rejects.toThrow('User is not in this chat')
  })
})
