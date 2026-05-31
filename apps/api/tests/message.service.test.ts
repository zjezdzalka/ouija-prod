/**
 * Unit tests for message.service.ts
 */

import { jest } from '@jest/globals'

jest.mock('@repositories/message.repository', () => ({
  getAllMessages: jest.fn(),
  createMessage: jest.fn(),
  findMessage: jest.fn(),
  updateMessage: jest.fn(),
  deleteMessage: jest.fn()
}))

jest.mock('@repositories/message.repository.redis', () => ({
  getAllMessages: jest.fn(),
  findMessage: jest.fn()
}))

import * as msgService from '@services/message.service'
import * as pgRepo from '@repositories/message.repository'
import * as redisRepo from '@repositories/message.repository.redis'

const mockPg = pgRepo as jest.Mocked<typeof pgRepo>
const mockRedis = redisRepo as jest.Mocked<typeof redisRepo>

const baseMessage = {
  id: 'msg1',
  chatId: 'chat1',
  senderId: 'u1',
  content: 'Hello',
  sentAt: new Date(),
  editedAt: null,
  attachments: [],
  reactions: []
}

beforeEach(() => jest.clearAllMocks())

// ── getAllMessages ─────────────────────────────────────────────────────────────

describe('msgService.getAllMessages', () => {
  it('queries postgres when no lastId is given', async () => {
    mockPg.getAllMessages.mockResolvedValue([baseMessage])
    const msgs = await msgService.getAllMessages('chat1', 50, '')
    expect(mockPg.getAllMessages).toHaveBeenCalledWith('chat1', 50, '')
    expect(msgs).toHaveLength(1)
  })

  it('falls back to postgres when lastId not found in redis', async () => {
    mockRedis.findMessage.mockResolvedValue(null)
    mockPg.getAllMessages.mockResolvedValue([baseMessage])

    const msgs = await msgService.getAllMessages('chat1', 50, 'msg_unknown')
    expect(mockPg.getAllMessages).toHaveBeenCalled()
    expect(msgs).toHaveLength(1)
  })

  it('queries redis when lastId found there', async () => {
    mockRedis.findMessage.mockResolvedValue(baseMessage)
    mockRedis.getAllMessages.mockResolvedValue([baseMessage])

    const msgs = await msgService.getAllMessages('chat1', 50, 'msg1')
    expect(mockRedis.getAllMessages).toHaveBeenCalledWith('chat1', 50)
    expect(mockPg.getAllMessages).not.toHaveBeenCalled()
    expect(msgs).toHaveLength(1)
  })
})

// ── createMessage ─────────────────────────────────────────────────────────────

describe('msgService.createMessage', () => {
  it('creates a message with content', async () => {
    mockPg.createMessage.mockResolvedValue(baseMessage)
    const msg = await msgService.createMessage('chat1', 'u1', 'Hello', [], [])
    expect(mockPg.createMessage).toHaveBeenCalledWith('chat1', 'u1', 'Hello', [], [])
    expect(msg.content).toBe('Hello')
  })

  it('throws when content is null and attachments empty', async () => {
    await expect(
      msgService.createMessage('chat1', 'u1', null as unknown as string, [], [])
    ).rejects.toThrow('Content and attachments cannot both be empty')
  })

  it('allows null content when attachments are present', async () => {
    const msgWithAttachment = { ...baseMessage, content: null, attachments: [{ id: 'a1', messageId: 'msg1', url: 'http://x.com/file.pdf', type: 'FILE' as const }] }
    mockPg.createMessage.mockResolvedValue(msgWithAttachment)

    await expect(
      msgService.createMessage('chat1', 'u1', null as unknown as string, [{ url: 'http://x.com/file.pdf', type: 'FILE' as const, name: 'file.pdf' } as never], [])
    ).resolves.not.toThrow()
  })
})

// ── updateMessage ─────────────────────────────────────────────────────────────

describe('msgService.updateMessage', () => {
  it('updates an existing message', async () => {
    mockPg.findMessage.mockResolvedValue(baseMessage)
    mockPg.updateMessage.mockResolvedValue({ ...baseMessage, content: 'Updated' })

    const result = await msgService.updateMessage('msg1', 'chat1', 'Updated', [], [])
    expect(result.content).toBe('Updated')
  })

  it('throws when message not found', async () => {
    mockPg.findMessage.mockResolvedValue(null)
    await expect(
      msgService.updateMessage('ghost', 'chat1', 'X', [], [])
    ).rejects.toThrow('Record does not exist')
  })
})

// ── deleteMessage ─────────────────────────────────────────────────────────────

describe('msgService.deleteMessage', () => {
  it('deletes an existing message', async () => {
    mockPg.findMessage.mockResolvedValue(baseMessage)
    mockPg.deleteMessage.mockResolvedValue(baseMessage)

    await msgService.deleteMessage('msg1', 'chat1')
    expect(mockPg.deleteMessage).toHaveBeenCalledWith('msg1', 'chat1')
  })

  it('throws when message not found', async () => {
    mockPg.findMessage.mockResolvedValue(null)
    await expect(msgService.deleteMessage('ghost', 'chat1')).rejects.toThrow(
      'Record does not exist'
    )
  })
})
