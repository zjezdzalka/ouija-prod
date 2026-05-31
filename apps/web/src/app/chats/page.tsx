'use client'

import styles from './Chats.module.scss'
import ProfilePopup from '../components/ProfilePopup/ProfilePopup'
import GroupInfoPopup from '../components/GroupInfoPopup/GroupInfoPopup'
import {
  useState,
  useEffect,
  useRef,
  FormEvent,
  Suspense,
  useCallback
} from 'react'
import { useSearchParams } from 'next/navigation'
import ChatSidebar from './ChatSidebar'
import ChatWindow from './ChatWindow'
import { ErrorBoundary } from '../components/ErrorBoundary/ErrorBoundary'
import {
  Chat,
  Message,
  UserStatus,
  UserSearchResult,
  ReactionType,
  REACTION_EMOJI,
  AttachmentType,
  API_URL,
  PAGE_SIZE
} from './types'
import { useSettings } from '@/context/SettingsContext'
import { updateSwNameCache } from '@/app/sw-register'
import { useTranslation } from '@/i18n/translations'
import { notFound } from 'next/navigation'
import { apiFetch, getToken, clearSession } from '@utils/auth'
import { storage } from '@utils/storage'
// ─── Główny komponent ─────────────────────────────────────────────────────────

function ChatsInner() {
  const userId =
    typeof window !== 'undefined'
      ? (storage.getUserId())
      : null

  if (!userId) {
    // Not logged in — show 404. We only call notFound() on the client where
    // we can be certain the value is truly absent (not just SSR with no localStorage).
    if (typeof window !== 'undefined') {
      notFound()
    }
    return null
  }
  return <ChatsWithUser userId={userId} />
}

function ChatsWithUser({ userId }: { userId: string }) {
  const searchParams = useSearchParams()

  // ── Stan ──
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(
    searchParams.get('chatId')
  )
  const activeChatIdRef = useRef<string | null>(searchParams.get('chatId'))
  const chatsRef = useRef<Chat[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [messageText, setMessageText] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [loadingChats, setLoadingChats] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [sending, setSending] = useState(false)
  const [myStatus, setMyStatus] = useState<UserStatus>('ONLINE')
  const myStatusRef = useRef<UserStatus>('ONLINE')
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [typingUsers, setTypingUsers] = useState<
    { userId: string; nickname: string; avatarUrl?: string | null }[]
  >([])
  const typingTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  )
  const isTypingRef = useRef(false)
  const typingThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [sentInvites, setSentInvites] = useState<Set<string>>(new Set())
  const [profilePopupUserId, setProfilePopupUserId] = useState<string | null>(
    null
  )
  const [groupInfoPopupChatId, setGroupInfoPopupChatId] = useState<
    string | null
  >(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchUsers, setSearchUsers] = useState<UserSearchResult[]>([])
  const [mutedChatIds, setMutedChatIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    return storage.getMutedChats()
  })
  const mutedChatIdsRef = useRef<Set<string>>(new Set())
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())

  // ── In-app notifications ──
  const [inAppNotifs, setInAppNotifs] = useState<
    { id: string; title: string; body: string; avatarUrl?: string | null; chatId?: string | null }[]
  >([])
  const notifIdCounter = useRef(0)

  // ── Mobile state ──
  const [isMobile, setIsMobile] = useState(false)
  const [mobileChatOpen, setMobileChatOpen] = useState(
    () => !!searchParams.get('chatId')
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // ── Refs ──
  const bottomRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const messageContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastIdRef = useRef<string>('')
  const isFirstLoad = useRef(true)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { settings } = useSettings()
  const { t } = useTranslation()

  // ── Załaduj znajomych i czaty razem ──
  useEffect(() => {
    Promise.all([
      apiFetch(`${API_URL}/api/users/${userId}/friends?status=ACCEPTED`)
        .then((r) => r.json())
        .then((data: { userId: string; friendId: string }[]) =>
          new Set(data.map((f) => (f.userId === userId ? f.friendId : f.userId)))
        ),
      apiFetch(`${API_URL}/api/users/${userId}/chats`)
        .then((r) => r.json())
        .then((data: Chat[]) =>
          Promise.all(
            data.map(async (chat) => {
              const res = await apiFetch(
                `${API_URL}/api/chats/${chat.id}/messages?limit=1`
              )
              if (!res.ok) return chat
              const msgs: Message[] = await res.json()
              return { ...chat, lastMessage: msgs[0] ?? null }
            })
          )
        )
    ])
      .then(([ids, enriched]) => {
        setFriendIds(ids)
        const sorted = enriched.sort((a, b) => {
          const ta = a.lastMessage?.sentAt ?? a.updatedAt
          const tb = b.lastMessage?.sentAt ?? b.updatedAt
          return new Date(tb).getTime() - new Date(ta).getTime()
        })
        setChats(sorted)
        // Only restore a chat from URL param (?chatId=...), never auto-select
        setActiveChatId((prev) => prev ?? null)
      })
      .catch(console.error)
      .finally(() => setLoadingChats(false))
  }, [userId])
  useEffect(() => {
    // If the user just logged back in after a previous session, restore their
    // pre-logout status (e.g. DnD/BUSY) instead of defaulting to ONLINE/OFFLINE
    const preLogout = localStorage.getItem(
      'preLogoutStatus'
    ) as UserStatus | null
    if (preLogout) {
      storage.removePreLogoutStatus()
      setMyStatus(preLogout)
      storage.setUserStatus(preLogout as UserStatus)
      // Push it to the server immediately
      apiFetch(`${API_URL}/api/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: preLogout })
      }).catch(console.error)
      return
    }

    // Use cached status first (avoids showing INVISIBLE flash on reconnect)
    const cached = storage.getUserStatus()
    if (cached && cached !== 'INVISIBLE') setMyStatus(cached)

    apiFetch(`${API_URL}/api/?id=${userId}`)
      .then((r) => r.json())
      .then((data: { status?: UserStatus }) => {
        if (data?.status) {
          // If DB has INVISIBLE it means we disconnected and the server hasn't
          // restored our status yet. Use cached status so dropdown doesn't flicker.
          const effectiveStatus =
            data.status === 'INVISIBLE'
              ? cached && cached !== 'INVISIBLE'
                ? cached
                : 'OFFLINE'
              : data.status
          setMyStatus(effectiveStatus as UserStatus)
          storage.setUserStatus(effectiveStatus)
        }
      })
      .catch(console.error)
  }, [userId])

  // Keep myStatusRef in sync so WS close handler can read current status
  useEffect(() => {
    myStatusRef.current = myStatus
  }, [myStatus])

  // ── Zamknij dropdown ──
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      const target = e.target as Node
      const inSearch =
        document.querySelector('[data-search-dropdown]')?.contains(target) ||
        document.querySelector('[data-search-input]')?.contains(target)
      if (!inSearch) setSearchOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  // ── Wyszukiwanie z debouncingiem ──
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    const q = searchQuery.trim()
    if (!q) {
      setSearchUsers([])
      return
    }

    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await apiFetch(`${API_URL}/api/?q=${encodeURIComponent(q)}`)
        if (res.ok)
          setSearchUsers(
            (await res.json()).filter((u: UserSearchResult) => u.id !== userId)
          )
      } catch {
        /* ignoruj */
      } finally {
        setSearchLoading(false)
      }
    }, 400)

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [searchQuery, userId])

  // ── Pobierz wiadomości ──
  useEffect(() => {
    if (!activeChatId) return
    setMessages([])
    setHasMore(true)
    lastIdRef.current = ''
    isFirstLoad.current = true
    setLoadingMessages(true)

    setChats((prev) =>
      prev.map((c) => (c.id === activeChatId ? { ...c, unreadCount: 0 } : c))
    )

    apiFetch(`${API_URL}/api/chats/${activeChatId}/messages?limit=${PAGE_SIZE}`)
      .then((r) => r.json())
      .then((data: Message[]) => {
        const sorted = [...data].reverse()
        setMessages(sorted)
        setHasMore(data.length === PAGE_SIZE)
        lastIdRef.current = data[data.length - 1]?.id ?? ''
      })
      .catch(console.error)
      .finally(() => setLoadingMessages(false))
  }, [activeChatId])

  // ── Sync activeChatIdRef ──
  useEffect(() => {
    activeChatIdRef.current = activeChatId
    // Clear typing indicators when switching chats
    typingTimeouts.current.forEach((t) => clearTimeout(t))
    typingTimeouts.current.clear()
    setTypingUsers([])
  }, [activeChatId])

  // ── Sync chatsRef so WS handlers can read latest chats ──
  useEffect(() => {
    chatsRef.current = chats
  }, [chats])

  // ── Keep SW name cache in sync so background notifications show nicknames ──
  useEffect(() => {
    const users = chats.flatMap((c) =>
      c.users
        .filter((u) => u.userId !== userId)
        .map((u) => ({ id: u.userId, nickname: u.user.nickname }))
    )
    updateSwNameCache(users)
  }, [chats])

  // ── Sync muted chats to localStorage, SW, and ref ──
  useEffect(() => {
    mutedChatIdsRef.current = mutedChatIds
    storage.setMutedChats(mutedChatIds)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'MUTED_CHATS',
        payload: [...mutedChatIds]
      })
    }
  }, [mutedChatIds])

  // ── WebSocket ──
  const wsRef = useRef<WebSocket | null>(null)
  useEffect(() => {
    const WS_URL = API_URL.replace(/^http/, 'ws')
    const token = getToken()
    if (!token) {
      clearSession()
      window.location.href = '/login'
      return
    }
    // Token is sent in the first message after connection — never in the URL
    const ws = new WebSocket(`${WS_URL}/ws`)
    wsRef.current = ws

    let authenticated = false

    const announceStatus = () => {
      const cached = storage.getUserStatus()
      const statusToAnnounce: UserStatus =
        cached && cached !== 'OFFLINE' && cached !== 'INVISIBLE'
          ? cached
          : 'ONLINE'
      setMyStatus(statusToAnnounce)
      storage.setUserStatus(statusToAnnounce as UserStatus)
      ws.send(
        JSON.stringify({
          type: 'user:status',
          payload: { status: statusToAnnounce }
        })
      )
      apiFetch(`${API_URL}/api/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusToAnnounce })
      }).catch(console.error)
    }

    ws.onopen = () => {
      // Server will prompt with auth:required; handled in onmessage below
    }

    // ── Set status to OFFLINE when the user closes/leaves the app ──
    const handleBeforeUnload = () => {
      const currentStatus = myStatusRef.current
      // Restore last active status next session (don't overwrite with OFFLINE)
      if (currentStatus !== 'OFFLINE' && currentStatus !== 'INVISIBLE') {
        storage.setUserStatus(currentStatus as UserStatus)
      }
      // Broadcast OFFLINE via WS (best-effort, synchronous send)
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({ type: 'user:status', payload: { status: 'OFFLINE' } })
        )
      }
      // Persist OFFLINE to server via sendBeacon for reliability on page close
      const token = getToken()
      if (token) {
        const blob = new Blob(
          [JSON.stringify({ status: 'OFFLINE' })],
          { type: 'application/json' }
        )
        navigator.sendBeacon(
          `${API_URL}/api/users/beacon/status?token=${encodeURIComponent(token)}`,
          blob
        )
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as {
          type: string
          payload: Record<string, unknown>
        }

        // Auth handshake — send token in-band, never in the URL
        if (msg.type === 'auth:required') {
          ws.send(JSON.stringify({ type: 'auth', token }))
          return
        }

        if (msg.type === 'connected') {
          authenticated = true
          announceStatus()
          return
        }

        if (!authenticated) return

        if (msg.type === 'message:created') {
          const newMsg = msg.payload as unknown as Message
          // Only append to the visible message list when the chat is open.
          // The duplicate guard handles the case where the sender already added
          // the message optimistically via the HTTP response.
          if (newMsg.chatId === activeChatIdRef.current) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
          }

          // Notify — only for messages from others, regardless of
          // whether the app is focused or which chat is open.
          if (newMsg.senderId !== userId) {
            setChats((prev) => {
              const chat = prev.find((c) => c.id === newMsg.chatId)
              const isMuted = mutedChatIdsRef.current.has(newMsg.chatId)
              const senderName =
                chat?.users.find((u) => u.userId === newMsg.senderId)?.user
                  .nickname ?? 'Ktoś'

              if (!isMuted) {
                triggerNotification(
                  senderName,
                  newMsg.content ?? '📎 Załącznik'
                )
              }

              return prev // no state change — side-effect only
            })
          }

          setChats((prev) => {
            const updated = prev.map((c) =>
              c.id === newMsg.chatId
                ? {
                  ...c,
                  lastMessage: newMsg,
                  unreadCount:
                    newMsg.chatId !== activeChatIdRef.current &&
                    newMsg.senderId !== userId
                      ? (c.unreadCount ?? 0) + 1
                      : c.unreadCount
                }
                : c
            )
            const idx = updated.findIndex((c) => c.id === newMsg.chatId)
            if (idx > 0) {
              const [chat] = updated.splice(idx, 1)
              updated.unshift(chat)
            }
            return updated
          })
          if (newMsg.chatId === activeChatIdRef.current) {
            setTimeout(
              () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }),
              50
            )
          }
        }

        if (msg.type === 'message:updated') {
          const updated = msg.payload as unknown as Message
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          )
        }

        if (msg.type === 'message:deleted') {
          const { messageId } = msg.payload as { messageId: string }
          setMessages((prev) => prev.filter((m) => m.id !== messageId))
        }

        if (
          msg.type === 'reaction:added' ||
          msg.type === 'reaction:updated' ||
          msg.type === 'reaction:deleted'
        ) {
          // Server sends { chatId, messageId, reaction: { userId, type, user? } }
          // or for deleted: { chatId, messageId, userId }
          const payload = msg.payload as {
            messageId: string
            userId?: string
            type?: ReactionType
            reaction?: {
              userId: string
              type: ReactionType
              user?: { nickname: string; avatarUrl?: string | null }
            }
          }
          const messageId = payload.messageId
          const rUserId = payload.reaction?.userId ?? payload.userId ?? ''
          const rType = (payload.reaction?.type ?? payload.type) as ReactionType
          const rUser = payload.reaction?.user

          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== messageId) return m
              const withoutUser = m.reactions.filter(
                (r) => r.userId !== rUserId
              )
              if (msg.type === 'reaction:deleted')
                return { ...m, reactions: withoutUser }
              // For own reactions, the optimistic update already applied the
              // correct state — only update if user info enrichment is available
              if (rUserId === userId && !rUser) return m
              return {
                ...m,
                reactions: [
                  ...withoutUser,
                  { messageId, userId: rUserId, type: rType, user: rUser }
                ]
              }
            })
          )
          // Notify the message owner when someone else reacts to their message
          if (msg.type === 'reaction:added' && rUserId !== userId) {
            setMessages((prev) => {
              const reactedMsg = prev.find((m) => m.id === messageId)
              if (reactedMsg && reactedMsg.senderId === userId) {
                const emoji = REACTION_EMOJI[rType] ?? '👍'
                triggerNotification(
                  t('chat.reactionTitle'),
                  `${emoji} ${t('chat.reactionBody')}`
                )
              }
              return prev
            })
          }
        }

        if (msg.type === 'chat:created') {
          const newChat = ((msg.payload as Record<string, unknown>).chat ??
            msg.payload) as unknown as Chat
          if (!newChat?.users) return
          setChats((prev) =>
            prev.some((c) => c.id === newChat.id) ? prev : [newChat, ...prev]
          )
        }

        if (msg.type === 'chat:updated') {
          const { chatId, chat, event, userId: eventUserId } = msg.payload as {
            chatId: string
            chat?: Chat
            event?: string
            userId?: string
          }
          if (event === 'member_removed' && eventUserId) {
            if (eventUserId === userId) {
              setChats((prev) => prev.filter((c) => c.id !== chatId))
              setActiveChatId((prev) => (prev === chatId ? null : prev))
            } else {
              apiFetch(`${API_URL}/api/chats/${chatId}`)
                .then((r) => (r.ok ? r.json() : null))
                .then((updated: Chat | null) => {
                  if (!updated) return
                  setChats((prev) =>
                    prev.map((c) =>
                      c.id === chatId
                        ? { ...updated, lastMessage: c.lastMessage, unreadCount: c.unreadCount }
                        : c
                    )
                  )
                })
                .catch(() => {})
            }
          } else if (event === 'member_added') {
            apiFetch(`${API_URL}/api/chats/${chatId}`)
              .then((r) => (r.ok ? r.json() : null))
              .then((updated: Chat | null) => {
                if (!updated) return
                setChats((prev) =>
                  prev.map((c) =>
                    c.id === chatId
                      ? { ...updated, lastMessage: c.lastMessage, unreadCount: c.unreadCount }
                      : c
                  )
                )
              })
              .catch(() => {})
          } else if (chat) {
            setChats((prev) =>
              prev.map((c) =>
                c.id === chatId
                  ? {
                    ...c,
                    ...chat,
                    lastMessage: c.lastMessage,
                    unreadCount: c.unreadCount
                  }
                  : c
              )
            )
          }
        }

        if (msg.type === 'chat:deleted') {
          const { chatId } = msg.payload as { chatId: string }
          setChats((prev) => prev.filter((c) => c.id !== chatId))
          setActiveChatId((prev) => (prev === chatId ? null : prev))
        }

        if (msg.type === 'friendship:requested') {
          const { friendship } = msg.payload as {
            friendship: { userId: string; user?: { nickname?: string; avatarUrl?: string | null } }
          }
          const senderNick =
            friendship?.user?.nickname ?? t('chat.someone')
          const senderAvatar = friendship?.user?.avatarUrl ?? null
          triggerNotification(senderNick, t('chat.friendRequestSent'), { avatarUrl: senderAvatar })
        }

        if (msg.type === 'friendship:deleted') {
          const { userId: fA, friendId: fB } = msg.payload as {
            userId: string
            friendId: string
          }
          const removedId = fA === userId ? fB : fA
          setFriendIds((prev) => {
            const next = new Set(prev)
            next.delete(removedId)
            return next
          })
          // If the removed friend's private chat is currently active, deselect it
          const currentChatId = activeChatIdRef.current
          if (currentChatId) {
            const activeChat = chatsRef.current.find((c) => c.id === currentChatId)
            const isPrivateChatWithRemovedFriend =
              activeChat?.type === 'PRIVATE' &&
              activeChat.users.some((u) => u.userId === removedId)
            if (isPrivateChatWithRemovedFriend) {
              setActiveChatId(null)
            }
          }
        }

        if (msg.type === 'friendship:updated') {
          const { friendship } = msg.payload as {
            friendship: {
              userId: string
              friendId: string
              status: string
              user?: { nickname?: string; avatarUrl?: string | null }
              friend?: { nickname?: string; avatarUrl?: string | null }
            }
          }
          if (friendship.status === 'ACCEPTED') {
            const newFriendId =
              friendship.userId === userId
                ? friendship.friendId
                : friendship.userId
            setFriendIds((prev) => new Set(prev).add(newFriendId))

            // The acceptor is the other party — read directly from payload
            const acceptorData =
              friendship.userId === userId ? friendship.friend : friendship.user
            const nick = acceptorData?.nickname ?? t('chat.someone')
            const avatarUrl = acceptorData?.avatarUrl ?? null
            triggerNotification(nick, t('chat.friendAcceptedTitle'), { avatarUrl })
          }
        }

        // ── Typing indicators ──
        if (msg.type === 'typing:start') {
          const {
            chatId,
            userId: typingUserId,
            nickname,
            avatarUrl
          } = msg.payload as {
            chatId: string
            userId: string
            nickname: string
            avatarUrl?: string | null
          }
          if (chatId !== activeChatIdRef.current) return
          // Auto-expire after 4s if no stop event
          const existing = typingTimeouts.current.get(typingUserId)
          if (existing) clearTimeout(existing)
          setTypingUsers((prev) => {
            if (prev.some((u) => u.userId === typingUserId)) return prev
            return [...prev, { userId: typingUserId, nickname, avatarUrl }]
          })
          typingTimeouts.current.set(
            typingUserId,
            setTimeout(() => {
              setTypingUsers((prev) =>
                prev.filter((u) => u.userId !== typingUserId)
              )
              typingTimeouts.current.delete(typingUserId)
            }, 4000)
          )
        }

        if (msg.type === 'typing:stop') {
          const { userId: typingUserId } = msg.payload as { userId: string }
          const t = typingTimeouts.current.get(typingUserId)
          if (t) {
            clearTimeout(t)
            typingTimeouts.current.delete(typingUserId)
          }
          setTypingUsers((prev) =>
            prev.filter((u) => u.userId !== typingUserId)
          )
        }

        // ── User status updates from others ──
        if (msg.type === 'user:status') {
          const {
            userId: changedUserId,
            status,
            self
          } = msg.payload as {
            userId: string
            status: string
            self?: boolean
          }
          // If this is our own status being restored after reconnect, update myStatus
          if (self || changedUserId === userId) {
            const restored = status as UserStatus
            setMyStatus(restored)
            storage.setUserStatus(restored as UserStatus)
          }
          setChats((prev) =>
            prev.map((c) => ({
              ...c,
              users: c.users.map((u) =>
                u.userId === changedUserId
                  ? { ...u, user: { ...u.user, status: status as UserStatus } }
                  : u
              )
            }))
          )
        }
      } catch {
        /* ignoruj */
      }
    }

    ws.onerror = (err) => console.error('[WS] błąd:', err)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      ws.close()
      wsRef.current = null
    }
  }, [userId])

  // ── Scroll do dołu przy pierwszym ładowaniu ──
  useEffect(() => {
    if (messages.length > 0 && isFirstLoad.current) {
      // Use setTimeout to ensure the DOM has painted before scrolling
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'auto' })
        isFirstLoad.current = false
      }, 50)
    }
  }, [messages])

  // ── Ładuj starsze wiadomości ──
  const loadMoreMessages = useCallback(async () => {
    if (!activeChatId || loadingMore || !hasMore) return
    if (isFirstLoad.current) return
    setLoadingMore(true)
    const container = messageContainerRef.current
    const prevScrollHeight = container?.scrollHeight ?? 0

    try {
      const res = await apiFetch(
        `${API_URL}/api/chats/${activeChatId}/messages?limit=${PAGE_SIZE}&lastId=${lastIdRef.current}`
      )
      const older: Message[] = await res.json()
      if (!older.length) {
        setHasMore(false)
        return
      }
      const sorted = [...older].reverse()
      lastIdRef.current = older[older.length - 1]?.id ?? ''
      setHasMore(older.length === PAGE_SIZE)
      setMessages((prev) => [...sorted, ...prev])
      requestAnimationFrame(() => {
        if (container)
          container.scrollTop = container.scrollHeight - prevScrollHeight
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingMore(false)
    }
  }, [activeChatId, loadingMore, hasMore])

  useEffect(() => {
    const sentinel = topSentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreMessages()
      },
      { threshold: 1.0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMoreMessages])

  // ── Powiadomienia ──
  function triggerNotification(
    title: string,
    body: string,
    opts?: { avatarUrl?: string | null; chatId?: string | null }
  ) {
    if (!settings.notificationsEnabled) return

    // In-app toast
    const notifId = `notif-${++notifIdCounter.current}`
    setInAppNotifs((prev) => [
      ...prev,
      { id: notifId, title, body, avatarUrl: opts?.avatarUrl, chatId: opts?.chatId ?? null }
    ])
    setTimeout(() => {
      setInAppNotifs((prev) => prev.filter((n) => n.id !== notifId))
    }, 5000)

    if (settings.notificationSound) {
      try {
        const customSound = settings.notificationSoundUrl
        if (customSound) {
          const audio = new Audio(customSound)
          audio.volume = 0.5
          audio.play().catch(() => {})
        } else {
          const ctx = new AudioContext()
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.frequency.value = 880
          gain.gain.value = 0.1
          osc.start()
          osc.stop(ctx.currentTime + 0.1)
        }
      } catch {
        /* ignoruj */
      }
    }

    if (
      settings.notificationDesktop &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      new Notification(title, { body, icon: '/ouija_white_logo_square.png' })
    }
  }

  // ── Wysyłanie wiadomości ──
  async function handleSendMessage(e: FormEvent) {
    e.preventDefault()
    if (!activeChatId || (!messageText.trim() && pendingFiles.length === 0))
      return
    setSending(true)
    // Stop typing indicator on send
    if (isTypingRef.current) {
      isTypingRef.current = false
      if (typingThrottleRef.current) clearTimeout(typingThrottleRef.current)
      wsRef.current?.send(
        JSON.stringify({
          type: 'typing:stop',
          payload: { chatId: activeChatId }
        })
      )
    }

    try {
      let attachments: { url: string; type: AttachmentType; name?: string }[] = []
      if (pendingFiles.length > 0) {
        const form = new FormData()
        form.append('ownerId', userId)
        pendingFiles.forEach((f) => form.append('files', f))
        const uploadRes = await apiFetch(`${API_URL}/api/media/upload`, {
          method: 'POST',
          body: form
        })
        if (!uploadRes.ok) {
          alert(t('chat.errorUpload'))
          setSending(false)
          return
        }
        const mediaFiles: { url: string; mimeType: string; filename: string }[] =
          await uploadRes.json()
        attachments = mediaFiles.map((mf, i) => ({
          url: mf.url,
          name: mf.filename ?? pendingFiles[i]?.name ?? undefined,
          type: mf.mimeType.startsWith('image/')
            ? 'IMAGE'
            : mf.mimeType.startsWith('video/')
              ? 'VIDEO'
              : mf.mimeType.startsWith('audio/')
                ? 'AUDIO'
                : 'FILE'
        }))
      }
      const res = await apiFetch(`${API_URL}/api/chats/${activeChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          content: messageText.trim() || null,
          attachments
        })
      })
      if (!res.ok) {
        alert(t('chat.errorSend'))
        setSending(false)
        return
      }
      // Don't append the message here — the WS 'message:created' event
      // will arrive for the sender too and is the single source of truth.
      // Adding it here as well caused a visible duplicate on first send
      // after a page refresh (race between HTTP response and WS delivery).
      await res.json()
      setMessageText('')
      setPendingFiles([])
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }),
        50
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : t('chat.errorSend'))
    } finally {
      setSending(false)
    }
  }

  // ── Reakcje ──
  async function handleReact(messageId: string, type: ReactionType) {
    const existing = messages
      .find((m) => m.id === messageId)
      ?.reactions.find((r) => r.userId === userId)
    const chatId = activeChatId
    if (!chatId) return
    try {
      if (existing?.type === type) {
        await apiFetch(
          `${API_URL}/api/chats/${chatId}/messages/${messageId}/reactions`,
          { method: 'DELETE' }
        )
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                ...m,
                reactions: m.reactions.filter((r) => r.userId !== userId)
              }
              : m
          )
        )
      } else if (existing) {
        await apiFetch(
          `${API_URL}/api/chats/${chatId}/messages/${messageId}/reactions`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type })
          }
        )
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                ...m,
                reactions: m.reactions.map((r) =>
                  r.userId === userId ? { ...r, type } : r
                )
              }
              : m
          )
        )
      } else {
        await apiFetch(`${API_URL}/api/chats/${chatId}/messages/${messageId}/reactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type })
        })
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m
            const withoutMe = m.reactions.filter((r) => r.userId !== userId)
            return {
              ...m,
              reactions: [...withoutMe, { messageId, userId, type }]
            }
          })
        )
      }
    } catch (err) {
      console.error(err)
    }
  }

  // ── Zmiana statusu ──
  async function handleStatusChange(status: UserStatus) {
    setMyStatus(status)
    setShowStatusMenu(false)
    storage.setUserStatus(status)
    // Immediately update the current user's own entries in all chats so the
    // navbar status dots reflect the change without waiting for a WS round-trip
    setChats((prev) =>
      prev.map((c) => ({
        ...c,
        users: c.users.map((u) =>
          u.userId === userId ? { ...u, user: { ...u.user, status } } : u
        )
      }))
    )
    // Notify server so it can persist and relay to friends
    wsRef.current?.send(
      JSON.stringify({ type: 'user:status', payload: { status } })
    )
    try {
      await apiFetch(`${API_URL}/api/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
    } catch (err) {
      console.error(err)
    }
  }

  // ── Typing indicator ──
  function handleTypingChange(isTyping: boolean) {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN || !activeChatId) return

    if (isTyping && !isTypingRef.current) {
      isTypingRef.current = true
      const chat = chats.find((c) => c.id === activeChatId)
      const me = chat?.users.find((u) => u.userId === userId)
      ws.send(
        JSON.stringify({
          type: 'typing:start',
          payload: {
            chatId: activeChatId,
            nickname: me?.user.nickname ?? 'Ktoś',
            avatarUrl: me?.user.avatarUrl ?? null
          }
        })
      )
    } else if (!isTyping && isTypingRef.current) {
      isTypingRef.current = false
      if (typingThrottleRef.current) clearTimeout(typingThrottleRef.current)
      ws.send(
        JSON.stringify({
          type: 'typing:stop',
          payload: { chatId: activeChatId }
        })
      )
    }

    // Auto-send stop after 3s of inactivity
    if (isTyping) {
      if (typingThrottleRef.current) clearTimeout(typingThrottleRef.current)
      typingThrottleRef.current = setTimeout(() => {
        if (isTypingRef.current) {
          isTypingRef.current = false
          wsRef.current?.send(
            JSON.stringify({
              type: 'typing:stop',
              payload: { chatId: activeChatId }
            })
          )
        }
      }, 6700)
    }
  }

  // ── Wyślij zaproszenie ──
  async function handleSendInvite(targetUserId: string) {
    try {
      const res = await apiFetch(`${API_URL}/api/users/${userId}/friends`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: targetUserId })
      })
      if (!res.ok) {
        alert(t('chat.errorInvite'))
        return
      }
      setSentInvites((prev) => new Set(prev).add(targetUserId))
    } catch {
      alert(t('chat.errorInvite'))
    }
  }

  // ── Zaakceptuj zaproszenie ──

  // ── Wycisz / odcisz czat ──
  function handleToggleMute(chatId: string) {
    setMutedChatIds((prev) => {
      const next = new Set(prev)
      if (next.has(chatId)) next.delete(chatId)
      else next.add(chatId)
      return next
    })
  }

  // ── Natywny listener dla file input ──
  useEffect(() => {
    const input = fileInputRef.current
    if (!input) return
    function onFileSelect() {
      const files = Array.from(input!.files ?? [])
      if (files.length > 0) {
        setPendingFiles((prev) => [...prev, ...files])
        input!.value = ''
      }
    }
    input.addEventListener('change', onFileSelect)
    return () => input.removeEventListener('change', onFileSelect)
  }, [])

  function handleFileChange() {
    /* handled by useEffect */
  }

  // ── Pochodne ──
  function getChatDisplayName(chat: Chat): string {
    if (chat.name) return chat.name
    return chat.users.find((u) => u.userId !== userId)?.user.nickname ?? 'Czat'
  }

  // Only show PRIVATE chats where the other user is still a friend.
  // Group chats (type !== 'PRIVATE') are always shown.
  const visibleChats = chats.filter((c) => {
    if (c.type !== 'PRIVATE') return true
    const otherId = c.users.find((u) => u.userId !== userId)?.userId
    return otherId ? friendIds.has(otherId) : true
  })

  // If the currently active chat is now hidden, deselect it
  const activeChatVisible = visibleChats.some((c) => c.id === activeChatId)
  if (activeChatId && !activeChatVisible) {
    // Use a timeout to avoid setState-during-render
    setTimeout(() => setActiveChatId(null), 0)
  }

  const filteredChats = searchQuery.trim()
    ? visibleChats.filter((c) =>
      getChatDisplayName(c).toLowerCase().includes(searchQuery.toLowerCase())
    )
    : visibleChats

  // For "new people" in search: exclude anyone who is already a friend
  const newPeopleResults = searchQuery.trim()
    ? searchUsers.filter((u) => !friendIds.has(u.id))
    : []

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null
  const otherUser =
    activeChat?.users.find((u) => u.userId !== userId)?.user ?? null

  async function handleCreateGroupChat(name: string, memberIds: string[]) {
    if (!userId) return
    const allIds = [userId, ...memberIds]
    if (allIds.length < 3) {
      alert('A group needs at least 3 members.')
      return
    }
    if (allIds.length > 10) {
      alert('A group can have at most 10 members.')
      return
    }
    const res = await apiFetch(`${API_URL}/api/chats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        type: 'GROUP',
        userIds: allIds
      })
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(err.error ?? 'Błąd tworzenia grupy')
      return
    }
    const chat = await res.json()
    // Nie dodajemy czatu ręcznie — serwer wyśle chat:created przez WS do wszystkich członków
    setActiveChatId(chat.id)
  }

  // ── Zarządzanie grupą ──
  async function handleRenameGroup(chatId: string, name: string) {
    const res = await apiFetch(`${API_URL}/api/chats/${chatId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
    if (!res.ok) {
      alert('Błąd zmiany nazwy')
      return
    }
    const updated = await res.json()
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, name: updated.name } : c))
    )
  }

  async function handleDeleteGroup(chatId: string) {
    if (!confirm('Na pewno usunąć grupę? Tej operacji nie można cofnąć.'))
      return
    const res = await apiFetch(`${API_URL}/api/chats/${chatId}`, {
      method: 'DELETE'
    })
    if (!res.ok) {
      alert('Błąd usuwania grupy')
      return
    }
    setChats((prev) => prev.filter((c) => c.id !== chatId))
    if (activeChatId === chatId) setActiveChatId(null)
  }

  async function handleRemoveFromGroup(chatId: string, memberId: string) {
    const res = await apiFetch(
      `${API_URL}/api/chats/${chatId}/members/${memberId}`,
      { method: 'DELETE' }
    )
    if (!res.ok) {
      alert('Błąd usuwania użytkownika z grupy')
    }
    // UI update comes via WS chat:updated → member_removed
  }

  async function handleTransferOwner(chatId: string, newOwnerId: string) {
    if (!userId) return
    const res = await apiFetch(
      `${API_URL}/api/chats/${chatId}/members/${newOwnerId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'ADMIN' })
      }
    )
    if (!res.ok) {
      alert('Błąd przekazania własności')
      return
    }
    // Downgrade current user to MEMBER
    await apiFetch(`${API_URL}/api/chats/${chatId}/members/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'MEMBER' })
    })
    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== chatId) return c
        return {
          ...c,
          users: c.users.map((u) => ({
            ...u,
            role:
              u.userId === newOwnerId
                ? 'ADMIN'
                : u.userId === userId
                  ? 'MEMBER'
                  : u.role
          }))
        }
      })
    )
  }

  async function handleAddMember(chatId: string, memberId: string) {
    const existingChat = chats.find((c) => c.id === chatId)
    if (existingChat && existingChat.users.length >= 10) {
      alert('This group has reached the maximum of 10 members.')
      return
    }
    const res = await apiFetch(`${API_URL}/api/chats/${chatId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: memberId, role: 'MEMBER' })
    })
    if (!res.ok) {
      alert('Błąd dodawania członka')
      return
    }
    const updatedChat = await res.json().catch(() => null)
    if (updatedChat) {
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId ? { ...c, users: updatedChat.users ?? c.users } : c
        )
      )
    }
  }

  async function handleUpgradeToGroup(
    chatId: string,
    name: string,
    extraMemberIds: string[]
  ) {
    const existingChat = chats.find((c) => c.id === chatId)
    if (!existingChat) return
    const existingUserIds = existingChat.users.map((u) => u.userId)
    const allMemberIds = [...new Set([...existingUserIds, ...extraMemberIds])]
    if (allMemberIds.length < 3) {
      alert('A group chat needs at least 3 members.')
      return
    }
    if (allMemberIds.length > 10) {
      alert('A group chat can have at most 10 members.')
      return
    }
    const res = await apiFetch(`${API_URL}/api/chats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type: 'GROUP', userIds: allMemberIds })
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(err.error ?? 'Błąd tworzenia grupy')
      return
    }
    const chat = await res.json()
    setActiveChatId(chat.id)
  }

  return (
    <div className={styles.containerOuter}>
      {/* ── In-app powiadomienia ── */}
      <div className={styles.InAppNotifContainer}>
        {inAppNotifs.map((n) => (
          <div
            key={n.id}
            className={styles.InAppNotif}
            onClick={() => {
              if (n.chatId) setActiveChatId(n.chatId)
              setInAppNotifs((prev) => prev.filter((x) => x.id !== n.id))
            }}
          >
            <img
              src={n.avatarUrl ?? '/ouija_white_logo_square.png'}
              className={styles.InAppNotifAvatar}
              alt=""
            />
            <div className={styles.InAppNotifBody}>
              <div className={styles.InAppNotifTitle}>{n.title}</div>
              <div className={styles.InAppNotifMsg}>{n.body}</div>
            </div>
            <button
              className={styles.InAppNotifClose}
              onClick={(e) => {
                e.stopPropagation()
                setInAppNotifs((prev) => prev.filter((x) => x.id !== n.id))
              }}
            >✕</button>
          </div>
        ))}
      </div>
      {/* Input poza warunkowym renderem */}
      <input
        type="file"
        id="file-upload-input"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,audio/mpeg,audio/ogg,application/pdf,text/plain,text/csv,text/markdown,application/json,application/zip,.txt,.csv,.md,.log,.json,.zip"
        style={{ display: 'none' }}
      />

      <ErrorBoundary name="Chat Sidebar">
      <ChatSidebar
        userId={userId}
        chats={visibleChats}
        activeChatId={activeChatId}
        myStatus={myStatus}
        showStatusMenu={showStatusMenu}
        setShowStatusMenu={setShowStatusMenu}
        onStatusChange={handleStatusChange}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        searchLoading={searchLoading}
        searchUsers={searchUsers}
        filteredChats={filteredChats}
        newPeopleResults={newPeopleResults}
        sentInvites={sentInvites}
        loadingChats={loadingChats}
        mutedChatIds={mutedChatIds}
        onToggleMute={handleToggleMute}
        onSelectChat={(id) => {
          setActiveChatId(id)
          setMobileChatOpen(true)
          setChats((prev) =>
            prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
          )
        }}
        onOpenProfile={setProfilePopupUserId}
        onOpenGroupInfo={setGroupInfoPopupChatId}
        onSendInvite={handleSendInvite}
        onCreateGroupChat={handleCreateGroupChat}
        isMobileHidden={isMobile && mobileChatOpen}
      />
      </ErrorBoundary>

      <ErrorBoundary name="Chat Window">
      <ChatWindow
        activeChat={activeChat}
        otherUser={otherUser}
        userId={userId}
        messages={messages}
        loadingMessages={loadingMessages}
        loadingMore={loadingMore}
        messageText={messageText}
        setMessageText={setMessageText}
        pendingFiles={pendingFiles}
        setPendingFiles={setPendingFiles}
        sending={sending}
        bottomRef={bottomRef}
        topSentinelRef={topSentinelRef}
        messageContainerRef={messageContainerRef}
        fileInputRef={fileInputRef}
        onSendMessage={handleSendMessage}
        onReact={handleReact}
        onOpenProfile={setProfilePopupUserId}
        getChatDisplayName={getChatDisplayName}
        onBack={isMobile ? () => setMobileChatOpen(false) : undefined}
        isMobileChatVisible={!isMobile || mobileChatOpen}
        onRenameGroup={handleRenameGroup}
        onDeleteGroup={handleDeleteGroup}
        onTransferOwner={handleTransferOwner}
        onRemoveMember={handleRemoveFromGroup}
        onAddMember={handleAddMember}
        onUpgradeToGroup={handleUpgradeToGroup}
        friendIds={friendIds}
        allChats={chats}
        typingUsers={typingUsers}
        onTypingChange={handleTypingChange}
        onPasteFile={(file) => setPendingFiles((prev) => [...prev, file])}
      />
      </ErrorBoundary>

      {profilePopupUserId && (
        <ProfilePopup
          userId={profilePopupUserId}
          viewerId={userId}
          onClose={() => setProfilePopupUserId(null)}
        />
      )}

      {groupInfoPopupChatId &&
        (() => {
          const groupChat = chats.find((c) => c.id === groupInfoPopupChatId)
          return groupChat ? (
            <GroupInfoPopup
              chat={groupChat}
              viewerId={userId}
              onClose={() => setGroupInfoPopupChatId(null)}
              onOpenProfile={(uid) => {
                setGroupInfoPopupChatId(null)
                setProfilePopupUserId(uid)
              }}
              onOpenChat={(chatId) => {
                setActiveChatId(chatId)
                setGroupInfoPopupChatId(null)
              }}
              onRemoveMember={handleRemoveFromGroup}
            />
          ) : null
        })()}
    </div>
)
}

export default function Chats() {
  return (
    <Suspense fallback={<p style={{ padding: '2rem' }}>Loading...</p>}>
      <ChatsInner />
    </Suspense>
  )
}