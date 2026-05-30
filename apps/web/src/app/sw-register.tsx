'use client'

import { useEffect } from 'react'
import { useSettings } from '@/context/SettingsContext'
import { API_URL } from '@/app/chats/types'

/**
 * Registers the service worker and keeps it configured with the current
 * userId, notification settings, and a sender name cache so it can show
 * correct notification titles even when the /chats page is closed.
 */
export default function SwRegister() {
  const { settings } = useSettings()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    const userId = localStorage.getItem('userId')
    const wsUrl = API_URL.replace(/^http/, 'ws')

    async function register() {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })

        await navigator.serviceWorker.ready

        function sendConfig(sw: ServiceWorker) {
          sw.postMessage({
            type: 'CONFIGURE',
            payload: {
              wsUrl,
              userId,
              notificationsEnabled: settings.notificationsEnabled,
              notificationDesktop: settings.notificationDesktop
            }
          })
        }

        if (reg.active) {
          sendConfig(reg.active)
        } else {
          const sw = reg.installing ?? reg.waiting
          sw?.addEventListener('statechange', () => {
            if ((sw as ServiceWorker).state === 'activated' && reg.active) {
              sendConfig(reg.active)
            }
          })
        }
      } catch (err) {
        console.error('[SW] Registration failed:', err)
      }
    }

    register()
  }, [settings.notificationsEnabled, settings.notificationDesktop])

  return null
}

/**
 * Call this from the chats page whenever the chat list changes so the SW
 * can resolve sender IDs to nicknames for background notifications.
 */
export function updateSwNameCache(users: { id: string; nickname: string }[]) {
  if (typeof navigator === 'undefined') return
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller)
    return

  const cache: Record<string, string> = {}
  for (const u of users) cache[u.id] = u.nickname

  navigator.serviceWorker.controller.postMessage({
    type: 'NAME_CACHE',
    payload: cache
  })
}
