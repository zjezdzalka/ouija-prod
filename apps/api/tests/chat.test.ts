import request from 'supertest'
import { TEST_TOKEN } from './setup'
import { app } from '@/app'
import { prisma } from '@/lib'
import {
  mockUser1,
  mockUser2,
  mockUser3,
  mockPrivateChat,
  mockGroupChat
} from './fixtures'
import { ChatRole, PrismaClient } from '@prisma/client'
import { Mocked } from 'jest-mock'

const db = prisma as Mocked<PrismaClient>

beforeEach(() => jest.clearAllMocks())

describe('GET /api/chats/:chatId', () => {
  it('returns a chat by id', async () => {
    db.chat.findUnique.mockResolvedValueOnce(mockPrivateChat)

    const res = await request(app).get('/api/chats/chat_private_001').set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe('chat_private_001')
    expect(res.body.type).toBe('PRIVATE')
  })

  it('returns 500 if chat not found', async () => {
    db.chat.findUnique.mockResolvedValueOnce(null)

    const res = await request(app).get('/api/chats/nonexistent').set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/not found/)
  })
})

describe('GET /api/users/:userId/chats', () => {
  it('returns all chats for a user', async () => {
    db.user.findUnique.mockResolvedValueOnce(mockUser1)
    db.chat.findMany.mockResolvedValueOnce([mockPrivateChat, mockGroupChat])

    const res = await request(app).get('/api/users/user_alice_001/chats').set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })
})

describe('POST /api/chats', () => {
  it('creates a private chat between two users', async () => {
    db.user.findUnique
      .mockResolvedValueOnce(mockUser1)
      .mockResolvedValueOnce(mockUser2)
    db.chat.create.mockResolvedValueOnce(mockPrivateChat)

    const res = await request(app)
      .post('/api/chats')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ type: 'PRIVATE', userIds: ['user_alice_001', 'user_bob_002'] })

    expect(res.status).toBe(201)
    expect(res.body.type).toBe('PRIVATE')
    expect(res.body.users).toHaveLength(2)
  })

  it('creates a group chat with a name', async () => {
    db.user.findUnique
      .mockResolvedValueOnce(mockUser1)
      .mockResolvedValueOnce(mockUser2)
      .mockResolvedValueOnce(mockUser3)
    db.chat.create.mockResolvedValueOnce(mockGroupChat)

    const res = await request(app)
      .post('/api/chats')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({
        name: 'Ouija Dev Team',
        type: 'GROUP',
        userIds: ['user_alice_001', 'user_bob_002', 'user_carol_003']
      })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Ouija Dev Team')
    expect(res.body.users).toHaveLength(3)
  })

  it('returns 500 if group chat has no name', async () => {
    const res = await request(app)
      .post('/api/chats')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ type: 'GROUP', userIds: ['user_alice_001', 'user_bob_002'] })

    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/name/)
  })

  it('returns 500 if fewer than 2 users provided', async () => {
    const res = await request(app)
      .post('/api/chats')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ type: 'PRIVATE', userIds: ['user_alice_001'] })

    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/two users/)
  })
})

describe('PUT /api/chats/:chatId', () => {
  it('updates a group chat name', async () => {
    db.chat.findUnique.mockResolvedValueOnce(mockGroupChat)
    db.chat.update.mockResolvedValueOnce({ ...mockGroupChat, name: 'New Name' })

    const res = await request(app)
      .put('/api/chats/chat_group_002')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ name: 'New Name' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('New Name')
  })
})

describe('DELETE /api/chats/:chatId', () => {
  it('deletes a chat and returns 204', async () => {
    db.chat.findUnique.mockResolvedValueOnce(mockGroupChat)
    db.chat.delete.mockResolvedValueOnce(mockGroupChat)

    const res = await request(app).delete('/api/chats/chat_group_002').set('Authorization', `Bearer ${TEST_TOKEN}`)

    expect(res.status).toBe(204)
  })
})

describe('POST /api/chats/:chatId/members', () => {
  it('adds a new member to a chat', async () => {
    const newMember = {
      chatId: mockGroupChat.id,
      userId: mockUser3.id,
      role: ChatRole.MEMBER,
      joinedAt: new Date()
    }
    db.chat.findUnique.mockResolvedValueOnce(mockGroupChat)
    db.user.findUnique.mockResolvedValueOnce(mockUser3)
    db.chatUser.findUnique.mockResolvedValueOnce(null) // not yet a member
    db.chatUser.create.mockResolvedValueOnce(newMember)

    const res = await request(app)
      .post('/api/chats/chat_group_002/members')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ userId: 'user_carol_003' })

    expect(res.status).toBe(201)
    expect(res.body.role).toBe('MEMBER')
  })

  it('returns 500 if user is already a member', async () => {
    db.chat.findUnique.mockResolvedValueOnce(mockGroupChat)
    db.user.findUnique.mockResolvedValueOnce(mockUser2)
    db.chatUser.findUnique.mockResolvedValueOnce({
      chatId: mockGroupChat.id,
      userId: mockUser2.id,
      role: ChatRole.MEMBER, // FIX: added missing required field
      joinedAt: new Date() // FIX: added missing required field
    }) // already member

    const res = await request(app)
      .post('/api/chats/chat_group_002/members')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ userId: 'user_bob_002' })

    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/already in chat/)
  })
})

describe('PUT /api/chats/:chatId/members/:userId', () => {
  it('promotes a member to admin', async () => {
    db.chatUser.findUnique.mockResolvedValueOnce({
      chatId: mockGroupChat.id,
      userId: mockUser2.id,
      role: ChatRole.MEMBER,
      joinedAt: new Date() // FIX: added missing required field
    })
    db.chatUser.update.mockResolvedValueOnce({
      chatId: mockGroupChat.id,
      userId: mockUser2.id,
      role: ChatRole.ADMIN,
      joinedAt: new Date() // FIX: added missing required field
    })

    const res = await request(app)
      .put('/api/chats/chat_group_002/members/user_bob_002')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ role: 'ADMIN' })

    expect(res.status).toBe(200)
    expect(res.body.role).toBe('ADMIN')
  })
})

describe('DELETE /api/chats/:chatId/members/:userId', () => {
  it('removes a member from a chat and returns 204', async () => {
    db.chatUser.findUnique.mockResolvedValueOnce({
      chatId: mockGroupChat.id,
      userId: mockUser2.id,
      role: ChatRole.MEMBER, // FIX: added missing required field
      joinedAt: new Date() // FIX: added missing required field
    })
    db.chatUser.delete.mockResolvedValueOnce({
      chatId: mockGroupChat.id,
      userId: mockUser2.id,
      role: ChatRole.MEMBER, // FIX: replaced empty {} with valid shape
      joinedAt: new Date()
    })

    const res = await request(app).delete(
      '/api/chats/chat_group_002/members/user_bob_002'
    )

    expect(res.status).toBe(204)
  })
})
