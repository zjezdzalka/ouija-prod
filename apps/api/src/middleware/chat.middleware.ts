import { Request, Response, NextFunction } from 'express'
import { prisma } from '@/lib'
import { AuthRequest } from './auth.middleware'

/**
 * requireChatMember
 *
 * Verifies that the authenticated user is a member of the chat identified by
 * req.params.chatId before allowing the request through.
 * Must be used after requireAuth so that req.userId is already set.
 */
export const requireChatMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = (req as AuthRequest).userId
  const chatId = req.params.chatId

  if (!chatId) {
    res.status(400).json({ error: 'chatId is required' })
    return
  }

  const membership = await prisma.chatUser.findUnique({
    where: { chatId_userId: { chatId, userId } }
  })

  if (!membership) {
    res.status(403).json({ error: 'you are not a member of this chat' })
    return
  }

  next()
}

/**
 * requireChatAdmin
 *
 * Like requireChatMember but also enforces ADMIN role.
 * Must be used after requireAuth.
 */
export const requireChatAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = (req as AuthRequest).userId
  const chatId = req.params.chatId

  if (!chatId) {
    res.status(400).json({ error: 'chatId is required' })
    return
  }

  const membership = await prisma.chatUser.findUnique({
    where: { chatId_userId: { chatId, userId } }
  })

  if (!membership) {
    res.status(403).json({ error: 'you are not a member of this chat' })
    return
  }

  if (membership.role !== 'ADMIN') {
    res.status(403).json({ error: 'admin role required' })
    return
  }

  next()
}

/**
 * requireMessageOwner
 *
 * Verifies that the authenticated user is the sender of the message identified
 * by req.params.messageId within req.params.chatId.
 * Must be used after requireAuth and requireChatMember.
 */
export const requireMessageOwner = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = (req as AuthRequest).userId
  const { chatId, messageId } = req.params

  const message = await prisma.message.findFirst({
    where: { id: messageId, chatId }
  })

  if (!message) {
    res.status(404).json({ error: 'message not found' })
    return
  }

  if (message.senderId !== userId) {
    res.status(403).json({ error: 'you can only modify your own messages' })
    return
  }

  next()
}
