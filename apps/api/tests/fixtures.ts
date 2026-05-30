import {
  UserStatus,
  FriendStatus,
  ChatType,
  ChatRole,
  AttachmentType,
  ReactionType
} from '@prisma/client'

// ─── Users ────────────────────────────────────────────────────────────────────

export const mockUser1 = {
  id: 'user_alice_001',
  email: 'alice@ouija.dev',
  password: 'hashed_password',
  nickname: 'alice',
  status: 'ONLINE' as UserStatus,
  avatarUrl: null,
  emailVerified: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
}

export const mockUser2 = {
  id: 'user_bob_002',
  email: 'bob@ouija.dev',
  password: 'hashed_password',
  nickname: 'bob',
  status: 'OFFLINE' as UserStatus,
  avatarUrl: null,
  emailVerified: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
}

export const mockUser3 = {
  id: 'user_carol_003',
  email: 'carol@ouija.dev',
  password: 'hashed_password',
  nickname: 'carol',
  status: 'AWAY' as UserStatus,
  avatarUrl: null,
  emailVerified: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
}

// ─── Friendships ──────────────────────────────────────────────────────────────

export const mockFriendshipPending = {
  userId: mockUser1.id,
  friendId: mockUser2.id,
  status: FriendStatus.PENDING,
  createdAt: new Date('2025-01-10T10:00:00Z'),
  updatedAt: new Date('2025-01-10T10:00:00Z'),
  user: mockUser1,
  friend: mockUser2
}

export const mockFriendshipAccepted = {
  userId: mockUser1.id,
  friendId: mockUser3.id,
  status: FriendStatus.ACCEPTED,
  createdAt: new Date('2025-01-11T10:00:00Z'),
  updatedAt: new Date('2025-01-12T10:00:00Z'),
  user: mockUser1,
  friend: mockUser3
}

// ─── Chats ────────────────────────────────────────────────────────────────────

export const mockPrivateChat = {
  id: 'chat_private_001',
  name: null,
  type: ChatType.PRIVATE,
  createdAt: new Date('2025-01-15T10:00:00Z'),
  updatedAt: new Date('2025-01-15T10:00:00Z'),
  users: [
    {
      chatId: 'chat_private_001',
      userId: mockUser1.id,
      joinedAt: new Date(),
      role: ChatRole.ADMIN,
      user: mockUser1
    },
    {
      chatId: 'chat_private_001',
      userId: mockUser2.id,
      joinedAt: new Date(),
      role: ChatRole.MEMBER,
      user: mockUser2
    }
  ]
}

export const mockGroupChat = {
  id: 'chat_group_002',
  name: 'Ouija Dev Team',
  type: ChatType.GROUP,
  createdAt: new Date('2025-01-16T10:00:00Z'),
  updatedAt: new Date('2025-01-16T10:00:00Z'),
  users: [
    {
      chatId: 'chat_group_002',
      userId: mockUser1.id,
      joinedAt: new Date(),
      role: ChatRole.ADMIN,
      user: mockUser1
    },
    {
      chatId: 'chat_group_002',
      userId: mockUser2.id,
      joinedAt: new Date(),
      role: ChatRole.MEMBER,
      user: mockUser2
    },
    {
      chatId: 'chat_group_002',
      userId: mockUser3.id,
      joinedAt: new Date(),
      role: ChatRole.MEMBER,
      user: mockUser3
    }
  ]
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export const mockMessage1 = {
  id: 'msg_001',
  chatId: mockPrivateChat.id,
  senderId: mockUser1.id,
  content: 'Hey Bob, how are you?',
  sentAt: new Date('2025-01-15T11:00:00Z'),
  editedAt: null,
  attachments: [],
  reactions: []
}

export const mockMessage2 = {
  id: 'msg_002',
  chatId: mockPrivateChat.id,
  senderId: mockUser2.id,
  content: 'All good Alice, you?',
  sentAt: new Date('2025-01-15T11:01:00Z'),
  editedAt: null,
  attachments: [],
  reactions: []
}

export const mockMessageWithAttachment = {
  id: 'msg_003',
  chatId: mockGroupChat.id,
  senderId: mockUser1.id,
  content: 'Check this out',
  sentAt: new Date('2025-01-16T12:00:00Z'),
  editedAt: null,
  attachments: [
    {
      id: 'attach_001',
      messageId: 'msg_003',
      url: 'https://cdn.ouija.dev/files/report.pdf',
      type: AttachmentType.FILE
    }
  ],
  reactions: []
}

// ─── Reactions ────────────────────────────────────────────────────────────────

export const mockReaction1 = {
  messageId: mockMessage1.id,
  userId: mockUser2.id,
  type: ReactionType.LIKE,
  createdAt: new Date('2025-01-15T11:05:00Z'),
  user: mockUser2
}

export const mockReaction2 = {
  messageId: mockMessage1.id,
  userId: mockUser3.id,
  type: ReactionType.LOVE,
  createdAt: new Date('2025-01-15T11:06:00Z'),
  user: mockUser3
}
