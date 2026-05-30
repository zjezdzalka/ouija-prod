'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'
export type Language = 'pl' | 'en'
export type FontSize = 'small' | 'medium' | 'large'

export interface AppSettings {
  theme: Theme
  language: Language
  fontSize: FontSize
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

interface SettingsContextValue {
  settings: AppSettings
  updateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => void
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSetting: () => {}
})

// Odczytaj ustawienia synchronicznie z localStorage — działa tylko po stronie klienta.
// Wywoływane raz przy inicjalizacji useState żeby uniknąć cyklu mount→null→mount.
function readStoredSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const stored = localStorage.getItem('appSettings')
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
  } catch {
    /* ignoruj */
  }
  return DEFAULT_SETTINGS
}

// Aplikuj motyw/font bezpośrednio na <html> — wywoływane synchronicznie
// żeby uniknąć flash of wrong theme.
function applyToDOM(s: AppSettings) {
  const root = document.documentElement
  root.setAttribute('data-theme', s.theme)
  root.setAttribute('lang', s.language)
  const sizes: Record<FontSize, string> = {
    small: '8px',
    medium: '10px',
    large: '12px'
  }
  root.style.fontSize = sizes[s.fontSize]
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // Inicjalizujemy od razu z localStorage — bez osobnego useEffect i bez mounted flag.
  // Dzięki temu children NIGDY się nie odmontowuje (brak `if (!mounted) return null`),
  // co eliminuje podwójne wczytywanie wiadomości w ChatsInner.
  const [settings, setSettings] = useState<AppSettings>(readStoredSettings)

  // Aplikuj na DOM przy każdej zmianie (w tym przy pierwszym renderze)
  useEffect(() => {
    applyToDOM(settings)
  }, [settings])

  function updateSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      localStorage.setItem('appSettings', JSON.stringify(next))
      return next
    })
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
