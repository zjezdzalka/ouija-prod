'use client'

import styles from './Profile.module.scss'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  useSettings,
  type AppSettings,
  type Theme,
  type Language,
  type FontSize
} from '@/context/SettingsContext'
import { useTranslation } from '@/i18n/translations'
import { apiFetch, clearSession } from '@utils/auth'
import ProfilePopup from '@/app/components/ProfilePopup/ProfilePopup'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const STATUS_COLOR: Record<string, string> = {
  ONLINE: '#2ecc71',
  AWAY: '#f39c12',
  BUSY: '#e74c3c',
  OFFLINE: '#7f8c8d'
}

function avatarSrc(url?: string | null) {
  return url ?? '/ouija_white_logo_square.png'
}

function SettingRow({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className={styles.SettingRow}>
      <span className={styles.SettingLabel}>{label}</span>
      <div className={styles.SettingControl}>{children}</div>
    </div>
  )
}

function Toggle({
  checked,
  onChange
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      className={`${styles.Toggle} ${checked ? styles.ToggleOn : ''}`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <span className={styles.ToggleThumb} />
    </button>
  )
}

interface UserEntry {
  id: string
  nickname: string
  status: string
  avatarUrl?: string | null
}

interface FriendEntry {
  userId: string
  friendId: string
  status: string
  user: UserEntry
  friend: UserEntry
}

type InviteEntry = FriendEntry

export default function Profile() {
  const router = useRouter()
  const { settings, updateSetting } = useSettings()
  const { t } = useTranslation()

  const userId =
    typeof window !== 'undefined' ? localStorage.getItem('userId') : null

  const [user, setUser] = useState<(UserEntry & { email?: string }) | null>(
    null
  )
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [pendingInvites, setPendingInvites] = useState<InviteEntry[]>([])
  const [sentInvites, setSentInvites] = useState<InviteEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [profilePopupUserId, setProfilePopupUserId] = useState<string | null>(
    null
  )

  const [settingsSaved, setSettingsSaved] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [passwordResetEnabled, setPasswordResetEnabled] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/api/auth/config`)
      .then((r) => r.json())
      .then((cfg) => setPasswordResetEnabled(cfg.enablePasswordReset ?? false))
      .catch(() => {})
  }, [])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user || !userId) return
    setAvatarUploading(true)
    try {
      const form = new FormData()
      form.append('avatar', file)
      // POST /api/media/avatar/:userId — uploads file AND sets avatarUrl on user in one call
      const res = await apiFetch(`${API_URL}/api/media/avatar/${userId}`, {
        method: 'POST',
        body: form
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error ?? 'Błąd uploadu avatara')
        return
      }
      const { media } = await res.json()
      // media.url is already the full rehydrated URL
      setUser((prev) => (prev ? { ...prev, avatarUrl: media.url } : prev))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Błąd zmiany avatara')
    } finally {
      setAvatarUploading(false)
    }
  }

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    async function fetchData() {
      try {
        const [userRes, friendsRes, pendingRes] = await Promise.all([
          apiFetch(`${API_URL}/api/?id=${userId}`),
          apiFetch(`${API_URL}/api/users/${userId}/friends?status=ACCEPTED`),
          apiFetch(`${API_URL}/api/users/${userId}/friends?status=PENDING`)
        ])
        if (!userRes.ok) {
          setError('Błąd pobierania profilu')
          setLoading(false)
          return
        }
        const [userData, friendsData, pendingData] = await Promise.all([
          userRes.json(),
          friendsRes.json(),
          pendingRes.json()
        ])
        setUser(userData)
        setFriends(friendsData)
        setPendingInvites(
          pendingData.filter((f: InviteEntry) => f.friendId === userId)
        )
        setSentInvites(
          pendingData.filter((f: InviteEntry) => f.userId === userId)
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : t('common.error'))
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [userId])

  function handleSaveSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) {
    updateSetting(key, value)
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 2000)
  }

  async function handleRemoveFriend(friendId: string) {
    if (!userId) return
    try {
      await apiFetch(`${API_URL}/api/users/${userId}/friends/${friendId}`, {
        method: 'DELETE'
      })
      setFriends((prev) =>
        prev.filter((f) => f.friendId !== friendId && f.userId !== friendId)
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Błąd')
    }
  }

  async function handleMessageFriend(friendId: string) {
    if (!userId) return
    try {
      const chatsRes = await apiFetch(`${API_URL}/api/users/${userId}/chats`)
      if (chatsRes.ok) {
        const chats = await chatsRes.json()
        const existing = chats.find(
          (c: { type: string; users: { userId: string }[] }) =>
            c.type === 'PRIVATE' && c.users.some((u) => u.userId === friendId)
        )
        if (existing) {
          router.push(`/chats?chatId=${existing.id}`)
          return
        }
      }
      const res = await apiFetch(`${API_URL}/api/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'PRIVATE', userIds: [userId, friendId] })
      })
      if (!res.ok) {
        alert('Błąd')
        return
      }
      const chat = await res.json()
      router.push(`/chats?chatId=${chat.id}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Błąd')
    }
  }

  async function handleAcceptInvite(inviterId: string) {
    if (!userId) return
    try {
      const res = await apiFetch(
        `${API_URL}/api/users/${inviterId}/friends/${userId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ACCEPTED' })
        }
      )
      if (!res.ok) {
        alert('Błąd akceptacji')
        return
      }
      const inviterRes = await apiFetch(`${API_URL}/api/?id=${inviterId}`)
      if (!inviterRes.ok) {
        alert('Błąd pobierania danych użytkownika')
        return
      }
      const inviterData = await inviterRes.json()
      const newFriend: FriendEntry = {
        userId: inviterId,
        friendId: userId,
        status: 'ACCEPTED',
        user: {
          id: inviterData.id,
          nickname: inviterData.nickname,
          status: inviterData.status,
          avatarUrl: inviterData.avatarUrl ?? null
        },
        friend: {
          id: user!.id,
          nickname: user!.nickname,
          status: user!.status,
          avatarUrl: user!.avatarUrl ?? null
        }
      }
      setFriends((prev) => [...prev, newFriend])
      setPendingInvites((prev) => prev.filter((i) => i.userId !== inviterId))
      // Automatically create a private chat with the new friend
      try {
        const chatsRes = await apiFetch(`${API_URL}/api/users/${userId}/chats`)
        if (chatsRes.ok) {
          const chats = await chatsRes.json()
          const existing = chats.find(
            (c: { type: string; users: { userId: string }[] }) =>
              c.type === 'PRIVATE' && c.users.some((u) => u.userId === inviterId)
          )
          if (!existing) {
            await apiFetch(`${API_URL}/api/chats`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'PRIVATE', userIds: [userId, inviterId] })
            })
          }
        }
      } catch {
        /* best-effort */
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Błąd')
    }
  }

  async function handleRejectInvite(inviterId: string) {
    if (!userId) return
    try {
      const res = await apiFetch(
        `${API_URL}/api/users/${inviterId}/friends/${userId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        alert('Błąd odrzucenia')
        return
      }
      setPendingInvites((prev) => prev.filter((i) => i.userId !== inviterId))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Błąd')
    }
  }

  async function handleCancelInvite(friendId: string) {
    if (!userId) return
    try {
      const res = await apiFetch(
        `${API_URL}/api/users/${userId}/friends/${friendId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        alert('Błąd cofania zaproszenia')
        return
      }
      setSentInvites((prev) => prev.filter((i) => i.friendId !== friendId))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Błąd')
    }
  }

  function getFriendUser(f: FriendEntry): UserEntry {
    return f.userId === userId ? f.friend : f.user
  }

  if (!userId) return <p className={styles.ErrorText}>{t('common.error')}</p>
  if (loading)
    return <p className={styles.LoadingText}>{t('common.loading')}</p>
  if (error) return <p className={styles.ErrorText}>{error}</p>
  if (!user) return null

  // Compute account details
  const accountCreatedAt = (
    user as UserEntry & { email?: string; createdAt?: string }
  ).createdAt
  const createdDate = accountCreatedAt ? new Date(accountCreatedAt) : null
  const accountAgeMs = createdDate ? Date.now() - createdDate.getTime() : null
  const accountAgeDays =
    accountAgeMs !== null
      ? Math.floor(accountAgeMs / (1000 * 60 * 60 * 24))
      : null
  const accountAgeHours =
    accountAgeMs !== null
      ? Math.floor((accountAgeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      : null
  const accountAgeMinutes =
    accountAgeMs !== null
      ? Math.floor((accountAgeMs % (1000 * 60 * 60)) / (1000 * 60))
      : null

  return (
    <div className={styles.PageWrapper}>
      {/* ── Profil ── */}
      <div className={`${styles.Section} ${styles.First}`}>
        <div className={styles.ProfileHeader}>
          <div className={styles.AvatarEditWrap}>
            <img
              className={styles.SectionProfilePicture}
              src={avatarSrc(user.avatarUrl)}
              alt="avatar"
              width={120}
              height={120}
            />
            <label
              className={styles.AvatarEditBtn}
              title={t('profile.changeAvatar')}
            >
              {avatarUploading ? '...' : '📷'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
                disabled={avatarUploading}
              />
            </label>
          </div>
          <div className={styles.ProfileInfo}>
            <h2 className={styles.ProfileNickname}>{user.nickname}</h2>
            <p className={styles.SectionText}>Email: {user.email}</p>
            <p className={styles.SectionText}>
              <span
                className={styles.StatusDotInline}
                style={{ background: STATUS_COLOR[user.status] }}
              />
              {t(`status.${user.status}` as never)}
            </p>
            {createdDate && (
              <p className={styles.SectionText}>
                {t('profile.accountCreated')}:{' '}
                {createdDate.toLocaleDateString()}
              </p>
            )}
            {accountAgeDays !== null && (
              <p className={styles.SectionText}>
                {t('profile.accountAge')}: {accountAgeDays}{' '}
                {t('profile.accountAgeDays')}, {accountAgeHours}h{' '}
                {accountAgeMinutes}m
              </p>
            )}
            {passwordResetEnabled && (
              <p className={styles.SectionText}>
                {t('profile.passwordLabel')}{' '}
                <a
                  style={{ cursor: 'pointer' }}
                  onClick={() => router.push('/forgot-password')}
                >
                  {t('profile.changePasswordRedirect')}
                </a>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── ProfilePopup ── */}
      {profilePopupUserId && (
        <ProfilePopup
          userId={profilePopupUserId}
          viewerId={userId}
          onClose={() => setProfilePopupUserId(null)}
        />
      )}

      {/* ── Two-column section: Friends/Invites | App Settings ── */}
      <div className={styles.TwoColumnSection}>
        {/* LEFT: Friend requests + Friends */}
        <div className={styles.TwoColumnLeft}>
          {/* ── Zaproszenia przychodzące (repeated here for column layout) ── */}
          {pendingInvites.length > 0 && (
            <div className={styles.ColumnCard}>
              <h2 className={styles.SectionHeading}>
                {t('profile.pendingInvites')}
                <span className={styles.Badge}>{pendingInvites.length}</span>
              </h2>
              {pendingInvites.map((invite) => (
                <div
                  key={`pi-${invite.userId}-${invite.friendId}`}
                  className={styles.SectionFriend}
                >
                  <div
                    className={styles.AvatarWrap}
                    style={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/profile/${invite.user.id}`)}
                  >
                    <img
                      className={styles.SectionFriendAvatar}
                      src={avatarSrc(invite.user.avatarUrl)}
                      alt="avatar"
                      width={40}
                      height={40}
                    />
                    <span
                      className={styles.StatusDot}
                      style={{ background: STATUS_COLOR[invite.user.status] }}
                    />
                  </div>
                  <div className={styles.FriendInfo}>
                    <h3 className={styles.SectionFriendName}>
                      {invite.user.nickname}
                    </h3>
                    <span className={styles.FriendStatusText}>
                      {t('profile.wantsToBeYourFriend')}
                    </span>
                  </div>
                  <button
                    className={styles.AcceptBtn}
                    onClick={() => handleAcceptInvite(invite.userId)}
                  >
                    {t('profile.accept')}
                  </button>
                  <button
                    className={styles.RejectBtn}
                    onClick={() => handleRejectInvite(invite.userId)}
                  >
                    {t('profile.reject')}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Wysłane zaproszenia ── */}
          {sentInvites.length > 0 && (
            <div className={styles.ColumnCard}>
              <h2 className={styles.SectionHeading}>
                {t('profile.sentInvites')}
                <span className={styles.Badge}>{sentInvites.length}</span>
              </h2>
              {sentInvites.map((invite) => (
                <div
                  key={`si-${invite.userId}-${invite.friendId}`}
                  className={styles.SectionFriend}
                >
                  <div
                    className={styles.AvatarWrap}
                    style={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/profile/${invite.friend.id}`)}
                  >
                    <img
                      className={styles.SectionFriendAvatar}
                      src={avatarSrc(invite.friend.avatarUrl)}
                      alt="avatar"
                      width={40}
                      height={40}
                    />
                    <span
                      className={styles.StatusDot}
                      style={{ background: STATUS_COLOR[invite.friend.status] }}
                    />
                  </div>
                  <div className={styles.FriendInfo}>
                    <h3 className={styles.SectionFriendName}>
                      {invite.friend.nickname}
                    </h3>
                    <span className={styles.FriendStatusText}>
                      · {t('profile.awaitingResponse')}
                    </span>
                  </div>
                  <button
                    className={styles.RejectBtn}
                    onClick={() => handleCancelInvite(invite.friendId)}
                  >
                    {t('profile.cancel')}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Znajomi ── */}
          <div className={styles.ColumnCard}>
            <h2 className={styles.SectionHeading}>{t('profile.friends')}</h2>
            {friends.length === 0 && (
              <p className={styles.SectionText}>{t('profile.noFriends')}</p>
            )}
            {friends.map((friendship) => {
              const friend = getFriendUser(friendship)
              return (
                <div
                  key={`${friendship.userId}-${friendship.friendId}`}
                  className={styles.SectionFriend}
                >
                  <div
                    className={styles.AvatarWrap}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setProfilePopupUserId(friend.id)}
                  >
                    <img
                      className={styles.SectionFriendAvatar}
                      src={avatarSrc(friend.avatarUrl)}
                      alt="avatar"
                      width={40}
                      height={40}
                    />
                    <span
                      className={styles.StatusDot}
                      style={{ background: STATUS_COLOR[friend.status] }}
                    />
                  </div>
                  <div className={styles.FriendInfo}>
                    <h3 className={styles.SectionFriendName}>
                      {friend.nickname}
                    </h3>
                    <span
                      className={styles.FriendStatusText}
                      style={{ color: STATUS_COLOR[friend.status] }}
                    >
                      {t(
                        `status.${friend.status}` as `status.${string}` &
                          Parameters<typeof t>[0]
                      ) ?? friend.status}
                    </span>
                  </div>
                  <button
                    className={styles.SectionFriendMessageButton}
                    onClick={() => handleMessageFriend(friend.id)}
                  >
                    {t('profile.message')}
                  </button>
                  <button
                    className={styles.SectionFriendDeleteButton}
                    onClick={() => handleRemoveFriend(friend.id)}
                  >
                    {t('profile.remove')}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT: App Settings */}
        <div className={styles.TwoColumnRight}>
          <div className={styles.ColumnCard}>
            <h2 className={styles.SectionHeading}>{t('profile.settings')}</h2>
            {settingsSaved && (
              <p className={styles.SuccessMsg}>{t('profile.saved')}</p>
            )}

            <div className={styles.SettingsGroup}>
              <h3 className={styles.SettingsGroupTitle}>
                {t('profile.appearance')}
              </h3>
              <SettingRow label={t('profile.theme')}>
                <div className={styles.SegmentedControl}>
                  {(['dark', 'light'] as Theme[]).map((th) => (
                    <button
                      key={th}
                      className={`${styles.SegmentBtn} ${settings.theme === th ? styles.SegmentBtnActive : ''}`}
                      onClick={() => handleSaveSetting('theme', th)}
                    >
                      {th === 'dark'
                        ? t('profile.themeDark')
                        : t('profile.themeLight')}
                    </button>
                  ))}
                </div>
              </SettingRow>
              <SettingRow label={t('profile.fontSize')}>
                <div className={styles.SegmentedControl}>
                  {(['small', 'medium', 'large'] as FontSize[]).map((val) => (
                    <button
                      key={val}
                      className={`${styles.SegmentBtn} ${settings.fontSize === val ? styles.SegmentBtnActive : ''}`}
                      onClick={() => handleSaveSetting('fontSize', val)}
                    >
                      {val === 'small'
                        ? t('profile.fontSmall')
                        : val === 'medium'
                          ? t('profile.fontMedium')
                          : t('profile.fontLarge')}
                    </button>
                  ))}
                </div>
              </SettingRow>
            </div>

            <div className={styles.SettingsGroup}>
              <h3 className={styles.SettingsGroupTitle}>
                {t('profile.language')}
              </h3>
              <SettingRow label={t('profile.language')}>
                <div className={styles.SegmentedControl}>
                  {(['pl', 'en'] as Language[]).map((val) => (
                    <button
                      key={val}
                      className={`${styles.SegmentBtn} ${settings.language === val ? styles.SegmentBtnActive : ''}`}
                      onClick={() => handleSaveSetting('language', val)}
                    >
                      {val === 'pl' ? t('profile.langPl') : t('profile.langEn')}
                    </button>
                  ))}
                </div>
              </SettingRow>
            </div>

            <div className={styles.SettingsGroup}>
              <h3 className={styles.SettingsGroupTitle}>
                {t('profile.notifications')}
              </h3>
              <SettingRow label={t('profile.notifications')}>
                <Toggle
                  checked={settings.notificationsEnabled}
                  onChange={(v) => handleSaveSetting('notificationsEnabled', v)}
                />
              </SettingRow>
              <SettingRow label={t('profile.notifSound')}>
                <Toggle
                  checked={settings.notificationSound}
                  onChange={(v) => handleSaveSetting('notificationSound', v)}
                />
              </SettingRow>
              {settings.notificationSound && (
                <SettingRow label="URL własnego dźwięku (mp3/ogg)">
                  <input
                    type="url"
                    placeholder="https://... (zostaw puste = domyślny)"
                    value={settings.notificationSoundUrl ?? ''}
                    onChange={(e) =>
                      handleSaveSetting('notificationSoundUrl', e.target.value)
                    }
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      color: 'var(--text)',
                      fontSize: '1.2rem',
                      padding: '0.4rem 0.7rem',
                      width: '100%',
                      fontFamily: 'inherit'
                    }}
                  />
                </SettingRow>
              )}
              <SettingRow label={t('profile.notifDesktop')}>
                <Toggle
                  checked={settings.notificationDesktop}
                  onChange={(v) => {
                    if (
                      v &&
                      typeof window !== 'undefined' &&
                      'Notification' in window
                    ) {
                      Notification.requestPermission().then((perm) => {
                        handleSaveSetting(
                          'notificationDesktop',
                          perm === 'granted'
                        )
                      })
                    } else {
                      handleSaveSetting('notificationDesktop', v)
                    }
                  }}
                />
              </SettingRow>
            </div>

            <div className={styles.SettingsGroup}>
              <h3 className={styles.SettingsGroupTitle}>
                {t('profile.account')}
              </h3>
              <button
                className={styles.DangerBtn}
                onClick={async () => {
                  if (confirm(t('profile.logoutConfirm'))) {
                    const uid = localStorage.getItem('userId')
                    if (uid) {
                      // Save the current status so we can restore it on next login
                      const currentStatus = localStorage.getItem('userStatus')
                      if (
                        currentStatus &&
                        currentStatus !== 'OFFLINE' &&
                        currentStatus !== 'INVISIBLE'
                      ) {
                        localStorage.setItem('preLogoutStatus', currentStatus)
                      }
                      // Set status to OFFLINE before disconnecting
                      try {
                        await apiFetch(`${API_URL}/api/${uid}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: 'OFFLINE' })
                        })
                      } catch {
                        /* best-effort */
                      }
                    }
                    localStorage.removeItem('userId')
                    localStorage.removeItem('userNickname')
                    localStorage.removeItem('userStatus')
                    clearSession()
                    router.push('/login')
                  }
                }}
              >
                {t('profile.logout')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
