import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { Server } from 'http'
import { prisma, tokenService } from '@/lib'

// Map of userId -> set of open sockets (one user can have multiple tabs/devices)
const userSockets = new Map<string, Set<WebSocket>>()

export type WsEventType =
  | 'message:created'
  | 'message:updated'
  | 'message:deleted'
  | 'reaction:added'
  | 'reaction:updated'
  | 'reaction:deleted'
  | 'friendship:requested'
  | 'friendship:updated'
  | 'friendship:deleted'
  | 'chat:created'
  | 'chat:updated'
  | 'chat:deleted'
  | 'typing:start'
  | 'typing:stop'
  | 'user:status'

export interface WsEvent {
  type: WsEventType
  payload: Record<string, unknown>
}

/**
 * Attach a WebSocket server to an existing HTTP server.
 *
 * Clients connect with:
 *   ws://host/ws?token=<sessionToken>
 *
 * The server keeps the connection alive with ping/pong every 30 s.
 */
export function attachWebSocketServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' })

  wss.on('connection', async (socket: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? '', 'http://localhost')
    const token = url.searchParams.get('token')

    if (!token) {
      socket.close(1008, 'token query parameter is required')
      return
    }

    const userId = await tokenService.validateSessionToken(token)
    if (!userId) {
      socket.close(1008, 'invalid or expired session token')
      return
    }

    // Register socket
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set())
    }
    userSockets.get(userId)!.add(socket)

    console.log(
      `[WS] User ${userId} connected (${userSockets.get(userId)!.size} sockets)`
    )

    // Restore previous status on reconnect if it was set to INVISIBLE by disconnect
    // We persist it in a separate map so we can restore it
    const savedStatus = userPreviousStatus.get(userId)
    if (savedStatus) {
      prisma.user
        .update({
          where: { id: userId },
          data: { status: savedStatus as never }
        })
        .then(() => {
          userPreviousStatus.delete(userId)
          broadcastStatusToFriends(userId, savedStatus)
          // Also notify the reconnecting user themselves so their UI reflects the restored status
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(
              JSON.stringify({
                type: 'user:status',
                payload: { userId, status: savedStatus, self: true }
              })
            )
          }
        })
        .catch(() => {
          /* ignore */
        })
    }

    // Keep-alive ping
    const pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.ping()
      }
    }, 30_000)

    socket.on('pong', () => {
      // Connection is still alive — nothing to do
    })

    // Handle messages sent FROM the client (typing indicators, etc.)
    socket.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as {
          type: string
          payload: Record<string, unknown>
        }

        if (msg.type === 'typing:start' || msg.type === 'typing:stop') {
          const { chatId, nickname, avatarUrl } = msg.payload as {
            chatId: string
            nickname: string
            avatarUrl?: string | null
          }
          if (!chatId) return
          // Relay to all other members of that chat
          prisma.chatUser
            .findMany({ where: { chatId }, select: { userId: true } })
            .then((members: { userId: string }[]) => {
              const otherIds = members
                .map((m) => m.userId)
                .filter((id: string) => id !== userId)
              sendToUsers(otherIds, {
                type: msg.type as WsEventType,
                payload: { chatId, userId, nickname, avatarUrl }
              })
            })
            .catch(() => {
              /* ignore */
            })
        }

        if (msg.type === 'user:status') {
          const { status } = msg.payload as { status: string }
          // The client is explicitly setting a status — clear any pending restore
          userPreviousStatus.delete(userId)
          broadcastStatusToFriends(userId, status)
        }
      } catch {
        /* ignore malformed messages */
      }
    })

    socket.on('close', () => {
      clearInterval(pingInterval)
      userSockets.get(userId)?.delete(socket)
      if (userSockets.get(userId)?.size === 0) {
        userSockets.delete(userId)
        // Save current status and set INVISIBLE (unless the user logged out
        // explicitly and already set their status to OFFLINE — in that case
        // keep OFFLINE so friends see the correct state and don't get a
        // misleading INVISIBLE->ONLINE restore cycle on next login)
        prisma.user
          .findUnique({ where: { id: userId }, select: { status: true } })
          .then((user: { status: string } | null) => {
            if (!user) return
            const currentStatus = user.status as string
            if (currentStatus === 'OFFLINE') {
              // User logged out intentionally — broadcast OFFLINE and stop
              broadcastStatusToFriends(userId, 'OFFLINE')
              return
            }
            if (currentStatus !== 'INVISIBLE') {
              userPreviousStatus.set(userId, currentStatus)
            }
            return prisma.user
              .update({
                where: { id: userId },
                data: { status: 'INVISIBLE' as never }
              })
              .then(() => {
                broadcastStatusToFriends(userId, 'INVISIBLE')
              })
          })
          .catch(() => {
            /* ignore */
          })
      }
      console.log(`[WS] User ${userId} disconnected`)
    })

    socket.on('error', (err) => {
      console.error(`[WS] Socket error for user ${userId}:`, err.message)
    })

    // Acknowledge successful connection
    socket.send(JSON.stringify({ type: 'connected', userId }))
  })

  wss.on('error', (err) => {
    console.error('[WS] Server error:', err.message)
  })

  console.log('[WS] WebSocket server attached at /ws')
  return wss
}

/**
 * Send an event to a specific user (all their connected sockets).
 */
export function sendToUser(userId: string, event: WsEvent): void {
  const sockets = userSockets.get(userId)
  if (!sockets) return
  const payload = JSON.stringify(event)
  for (const socket of sockets) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload)
    }
  }
}

/**
 * Send an event to multiple users at once.
 */
export function sendToUsers(userIds: string[], event: WsEvent): void {
  for (const userId of userIds) {
    sendToUser(userId, event)
  }
}

/**
 * Broadcast an event to every connected client (e.g. server-wide announcements).
 */
export function broadcast(event: WsEvent, wss: WebSocketServer): void {
  const payload = JSON.stringify(event)
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload)
    }
  })
}

// ─── Status tracking ──────────────────────────────────────────────────────────

/** Stores the last explicit status for a user so we can restore it on reconnect */
const userPreviousStatus = new Map<string, string>()

/**
 * Notify all friends (and chat members) of a user's new status.
 * We broadcast to every connected socket of users who share a chat with this user.
 */
async function broadcastStatusToFriends(
  userId: string,
  status: string
): Promise<void> {
  try {
    // Find all users who share at least one chat with this user
    const chatUsers = await prisma.chatUser.findMany({
      where: {
        chatId: {
          in: (
            await prisma.chatUser.findMany({
              where: { userId },
              select: { chatId: true }
            })
          ).map((c: { chatId: string }) => c.chatId)
        }
      },
      select: { userId: true }
    })
    const friendIds = [
      ...new Set(
        chatUsers
          .map((cu: { userId: string }) => cu.userId)
          .filter((id: string) => id !== userId)
      )
    ] as string[]
    sendToUsers(friendIds, {
      type: 'user:status',
      payload: { userId, status }
    })
  } catch {
    /* ignore */
  }
}
