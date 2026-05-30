/**
 * Ouija Service Worker
 *
 * Responsibilities:
 *  1. Keep a WebSocket open to the API so notifications arrive even when
 *     the page is closed or on a different route.
 *  2. Receive SHOW_NOTIFICATION messages from the page (when it's open) so
 *     the SW is the single place that calls showNotification — no duplicates.
 *  3. Handle CONFIGURE messages from the page to update userId / wsUrl /
 *     settings without needing to re-register.
 */

let wsUrl = null
let userId = null
let notificationsEnabled = true
let notificationDesktop = true
let socket = null
let reconnectTimer = null
let nameCache = {} // senderId -> nickname, kept up to date by the page
let mutedChats = new Set() // chatIds that the user has muted

// ── Config sent from the page ──────────────────────────────────────────────

self.addEventListener('message', (event) => {
  const { type, payload } = event.data ?? {}

  if (type === 'CONFIGURE') {
    wsUrl = payload.wsUrl
    userId = payload.userId
    notificationsEnabled = payload.notificationsEnabled ?? true
    notificationDesktop = payload.notificationDesktop ?? true
    connectWebSocket()
    return
  }

  if (type === 'SHOW_NOTIFICATION') {
    // Page is open — it already played the sound; we just show the
    // desktop notification if permitted.
    const { title, body } = payload
    showDesktopNotification(title, body)
    return
  }

  if (type === 'NAME_CACHE') {
    nameCache = payload ?? {}
    return
  }

  if (type === 'MUTED_CHATS') {
    mutedChats = new Set(payload ?? [])
    return
  }

  if (type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// ── WebSocket ──────────────────────────────────────────────────────────────

function connectWebSocket() {
  if (!wsUrl || !userId) return
  if (
    socket &&
    (socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING)
  )
    return

  socket = new WebSocket(`${wsUrl}/ws?userId=${userId}`)

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data)
      if (msg.type !== 'message:created') return

      const newMsg = msg.payload
      if (!newMsg || newMsg.senderId === userId) return

      // Skip notification if this chat is muted
      if (mutedChats.has(newMsg.chatId)) return

      // Check if the /chats page is currently focused — if so, the page
      // will call SHOW_NOTIFICATION itself (with sound), so skip here.
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => {
          const chatsOpen = clients.some(
            (c) =>
              c.visibilityState === 'visible' &&
              new URL(c.url).pathname === '/chats'
          )
          if (chatsOpen) return // page handles it

          // Look up sender name from the cache the page keeps updated
          const senderName = nameCache[newMsg.senderId] ?? 'New message'
          showDesktopNotification(senderName, newMsg.content ?? '📎 Attachment')
        })
    } catch {
      // ignore parse errors
    }
  }

  socket.onclose = () => {
    socket = null
    // Only reconnect if we still have a valid config
    if (!wsUrl || !userId) return
    if (reconnectTimer) clearTimeout(reconnectTimer)
    reconnectTimer = setTimeout(connectWebSocket, 5000)
  }

  socket.onerror = () => {
    socket?.close()
  }
}

// ── Notification helper ────────────────────────────────────────────────────

function showDesktopNotification(title, body) {
  if (!notificationsEnabled || !notificationDesktop) return
  if (Notification.permission !== 'granted') return

  self.registration.showNotification(title, {
    body,
    icon: '/ouija_white_logo_square.png',
    badge: '/ouija_white_logo.png',
    tag: 'ouija-message', // replace rather than stack
    renotify: true
  })
}

// ── Notification click — focus or open /chats ──────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const chatsClient = clients.find(
          (c) => new URL(c.url).pathname === '/chats'
        )
        if (chatsClient) return chatsClient.focus()
        return self.clients.openWindow('/chats')
      })
  )
})

// ── Activate immediately ───────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
