// ─── Typy ─────────────────────────────────────────────────────────────────────

export type ReactionType =
  | 'LIKE'
  | 'LOVE'
  | 'LAUGH'
  | 'SAD'
  | 'ANGRY'
  | 'THUMBS_UP'
  | 'THUMBS_DOWN'
export type AttachmentType = 'IMAGE' | 'VIDEO' | 'FILE' | 'AUDIO'
export type UserStatus = 'ONLINE' | 'OFFLINE' | 'AWAY' | 'BUSY' | 'INVISIBLE'

export interface Reaction {
  messageId: string
  userId: string
  type: ReactionType
  user?: { nickname: string; avatarUrl?: string | null }
}
export interface Attachment {
  id: string
  url: string
  type: AttachmentType
  name?: string
}

export interface Message {
  id: string
  chatId: string
  senderId: string
  content: string | null
  sentAt: string
  editedAt: string | null
  attachments: Attachment[]
  reactions: Reaction[]
}

export interface ChatUserEntry {
  userId: string
  chatId: string
  role: string
  joinedAt: string
  user: {
    id: string
    nickname: string
    status: UserStatus
    avatarUrl?: string | null
  }
}

export interface Chat {
  id: string
  name: string | null
  avatarUrl?: string | null
  type: string
  createdAt: string
  updatedAt: string
  users: ChatUserEntry[]
  // Wzbogacone pola doklejane po stronie frontu
  lastMessage?: Message | null
  unreadCount?: number
  muted?: boolean
}

export interface UserSearchResult {
  id: string
  nickname: string
  status: UserStatus
  avatarUrl?: string | null
}

// ─── Stałe ────────────────────────────────────────────────────────────────────

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export const REACTION_EMOJI: Record<ReactionType, string> = {
  LIKE: '👍',
  LOVE: '❤️',
  LAUGH: '😂',
  SAD: '😢',
  ANGRY: '😡',
  THUMBS_UP: '👆',
  THUMBS_DOWN: '👇'
}

// STATUS_LABEL jest teraz w i18n/translations.ts (klucze 'status.ONLINE' itd.)
// Zostawiamy tu wersję fallback dla komponentów które nie mają dostępu do hooka
export const STATUS_LABEL: Record<UserStatus, string> = {
  ONLINE: 'Aktywny',
  AWAY: 'Zaraz wracam',
  BUSY: 'Nie przeszkadzać',
  OFFLINE: 'Offline',
  INVISIBLE: 'Niewidoczny'
}

export const STATUS_COLOR: Record<UserStatus, string> = {
  ONLINE: '#2ecc71',
  AWAY: '#f39c12',
  BUSY: '#e74c3c',
  OFFLINE: '#7f8c8d',
  INVISIBLE: '#7f8c8d'
}

export const PAGE_SIZE = 20

export function avatarSrc(url?: string | null) {
  return url ?? '/ouija_white_logo_square.png'
}

// ─── Ustawienia powiadomień ────────────────────────────────────────────────────

export interface AppSettings {
  theme: 'dark' | 'light'
  language: 'pl' | 'en'
  fontSize: 'small' | 'medium' | 'large'
  notificationsEnabled: boolean
  notificationSound: boolean
  notificationDesktop: boolean
  notificationSoundUrl: string
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  language: 'pl',
  fontSize: 'medium',
  notificationsEnabled: true,
  notificationSound: true,
  notificationDesktop: false,
  notificationSoundUrl: ''
}

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const s = localStorage.getItem('appSettings')
    return s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}
