/**
 * Centralised client-side storage helpers.
 *
 * All localStorage keys live here.  If a key name ever needs to change
 * there is exactly one place to update — not a grep hunt through 1 400 lines.
 *
 * Every getter returns `null` on SSR (no `window`) and on parse errors so
 * components never have to guard for those cases themselves.
 */

import type { UserStatus } from '@/app/chats/types'

// ── Key constants ─────────────────────────────────────────────────────────────

const KEYS = {
  userId: 'userId',
  userStatus: 'userStatus',
  mutedChats: 'mutedChats',
  preLogoutStatus: 'preLogoutStatus',
  appSettings: 'appSettings'
} as const

type Key = keyof typeof KEYS

// ── Safe primitive ────────────────────────────────────────────────────────────

function getItem(key: Key): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(KEYS[key])
  } catch {
    return null
  }
}

function setItem(key: Key, value: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEYS[key], value)
  } catch {
    // Quota exceeded or private-browsing restriction — ignore silently
  }
}

function removeItem(key: Key): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(KEYS[key])
  } catch {
    // ignore
  }
}

// ── Typed accessors ───────────────────────────────────────────────────────────

export const storage = {
  // userId
  getUserId(): string | null {
    return getItem('userId')
  },
  setUserId(id: string): void {
    setItem('userId', id)
  },
  removeUserId(): void {
    removeItem('userId')
  },

  // userStatus
  getUserStatus(): UserStatus | null {
    return getItem('userStatus') as UserStatus | null
  },
  setUserStatus(status: UserStatus): void {
    setItem('userStatus', status)
  },

  // mutedChats — stored as a JSON array of chat IDs
  getMutedChats(): Set<string> {
    try {
      const raw = getItem('mutedChats')
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
    } catch {
      return new Set()
    }
  },
  setMutedChats(ids: Set<string>): void {
    setItem('mutedChats', JSON.stringify([...ids]))
  },

  // preLogoutStatus — persists status across logout/login cycles
  getPreLogoutStatus(): UserStatus | null {
    return getItem('preLogoutStatus') as UserStatus | null
  },
  setPreLogoutStatus(status: UserStatus): void {
    setItem('preLogoutStatus', status)
  },
  removePreLogoutStatus(): void {
    removeItem('preLogoutStatus')
  }
}
