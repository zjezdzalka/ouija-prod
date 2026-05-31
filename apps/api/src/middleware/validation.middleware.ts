/**
 * Shared input-validation middleware and Zod schemas for every route.
 *
 * Keeps validation co-located with the schema definitions so adding a new
 * field to a route means editing exactly one place.
 */

import { Request, Response, NextFunction } from 'express'
import { z, ZodSchema } from 'zod'
import { ChatType, ChatRole, FriendStatus } from '@prisma/client'

// ── Generic factory ───────────────────────────────────────────────────────────

/**
 * Returns an Express middleware that validates `req.body` against `schema`.
 * On success it replaces `req.body` with the parsed (and coerced) value so
 * that downstream code never sees raw user input.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      // Use .issues instead of .errors
      res.status(400).json({
        error: result.error.issues[0]?.message ?? 'invalid request body'
      })
      return
    }
    req.body = result.data
    next()
  }
}

/**
 * Returns an Express middleware that validates `req.query` against `schema`.
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      // Use .issues instead of .errors
      res.status(400).json({
        error: result.error.issues[0]?.message ?? 'invalid query parameters'
      })
      return
    }

    // `req.query` is a getter-only property on IncomingMessage in newer versions
    // of the `router` package (Express 5+). Direct assignment throws a TypeError,
    // so we use Object.defineProperty to shadow it with the coerced value.
    Object.defineProperty(req, 'query', {
      value: result.data,
      writable: true,
      configurable: true
    })

    next()
  }
}

// ── Chat schemas ──────────────────────────────────────────────────────────────

export const createChatSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  type: z.nativeEnum(ChatType),
  userIds: z.array(z.string().min(1)).min(2)
})

export const updateChatSchema = z.object({
  // `type` is intentionally excluded — a chat's type (PRIVATE/GROUP) is immutable
  // after creation.  Allowing it to change would let an admin convert a private
  // 1-to-1 conversation into a group chat and add arbitrary members to it.
  name: z.string().min(1).max(64).optional()
}).refine((d) => Object.keys(d).length > 0, { message: 'No update data provided' })

export const addChatMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(ChatRole).optional()
})

export const updateChatMemberRoleSchema = z.object({
  role: z.nativeEnum(ChatRole)
})

// ── Message schemas ───────────────────────────────────────────────────────────

const attachmentSchema = z.object({
  url: z.string().url(),
  type: z.enum(['IMAGE', 'VIDEO', 'FILE', 'AUDIO']),
  name: z.string().max(255).optional()
})

// userId is intentionally absent — reactions are always attributed to the authenticated
// session user, never to a client-supplied value.  The controller injects req.userId.
const reactionSchema = z.object({
  type: z.enum(['LIKE', 'LOVE', 'LAUGH', 'SAD', 'ANGRY', 'THUMBS_UP', 'THUMBS_DOWN'])
})

export const createMessageSchema = z
    .object({
      content: z.string().max(4000).nullable().optional(),
      attachments: z.array(attachmentSchema).max(10).optional().default([]),
      reactions: z.array(reactionSchema).optional().default([])
    })
    .refine(
        (d) => d.content != null || (d.attachments && d.attachments.length > 0),
        { message: 'Content and attachments cannot both be empty' }
    )

export const updateMessageSchema = z.object({
  content: z.string().max(4000).nullable().optional(),
  attachments: z.array(attachmentSchema).max(10).optional().default([]),
  reactions: z.array(reactionSchema).optional().default([])
})

export const getMessagesQuerySchema = z.object({
  limit: z
      .string()
      .optional()
      .transform((v) => (v ? parseInt(v, 10) : 50))
      .refine((v) => v > 0 && v <= 200, { message: 'limit must be 1–200' }),
  lastId: z.string().optional().default('')
})

// ── Friendship schemas ────────────────────────────────────────────────────────

export const sendFriendRequestSchema = z.object({
  friendId: z.string().min(1)
})

export const updateFriendshipSchema = z.object({
  status: z.nativeEnum(FriendStatus)
})

// ── User schemas ──────────────────────────────────────────────────────────────

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nickname: z
      .string()
      .min(3)
      .max(32)
      .regex(/^[a-zA-Z0-9_-]+$/, 'nickname may only contain letters, numbers, underscores and hyphens')
})

export const updateUserSchema = z
    .object({
      nickname: z
          .string()
          .min(3)
          .max(32)
          .regex(/^[a-zA-Z0-9_-]+$/)
          .optional(),
      password: z.string().min(8).optional(),
      status: z.enum(['ONLINE', 'OFFLINE', 'AWAY', 'BUSY', 'INVISIBLE']).optional(),
      avatarUrl: z.string().url().nullable().optional()
    })
    .refine((d) => Object.keys(d).length > 0, { message: 'No update data provided' })

// ── Media schemas ─────────────────────────────────────────────────────────────
// requesterId is intentionally absent — the controller derives it from the session,
// never from client-supplied input.
z.object({})