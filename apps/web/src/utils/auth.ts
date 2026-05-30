/**
 * Thin helpers for storing/reading the session token in localStorage.
 * All API fetches should go through `apiFetch` so the token is attached automatically.
 */

const TOKEN_KEY = 'sessionToken'
const USER_ID_KEY = 'userId'
const USER_NICKNAME_KEY = 'userNickname'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function saveSession(token: string, userId: string, nickname: string) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_ID_KEY, userId)
  localStorage.setItem(USER_NICKNAME_KEY, nickname)
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_ID_KEY)
  localStorage.removeItem(USER_NICKNAME_KEY)
}

/**
 * Wrapper around fetch that automatically injects the session token header.
 * If any request gets a 401 back, the stale session is cleared and the user
 * is redirected to the login page — this handles DB resets gracefully.
 */
export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers = new Headers(init.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const res = await fetch(url, { ...init, headers })
  if (res.status === 401) {
    clearSession()
    window.location.href = '/login'
  }
  return res
}
