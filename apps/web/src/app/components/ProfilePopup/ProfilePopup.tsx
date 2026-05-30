'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './ProfilePopup.module.scss'
import { useTranslation } from '@/i18n/translations'
import { apiFetch } from '@utils/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

type UserStatus = 'ONLINE' | 'OFFLINE' | 'AWAY' | 'BUSY'

const STATUS_COLOR: Record<UserStatus, string> = {
  ONLINE: '#2ecc71',
  AWAY: '#f39c12',
  BUSY: '#e74c3c',
  OFFLINE: '#7f8c8d'
}

interface ProfileUser {
  id: string
  nickname: string
  username?: string
  status: UserStatus
  avatarUrl?: string | null
  bio?: string | null
  joinedAt?: string
}

interface MutualFriend {
  id: string
  nickname: string
  status: UserStatus
  avatarUrl?: string | null
}

interface ProfilePopupProps {
  userId: string // the target user's id
  viewerId: string // the logged-in user's id
  onClose: () => void
}

function avatarSrc(url?: string | null) {
  return url ?? '/ouija_white_logo_square.png'
}

export default function ProfilePopup({
  userId,
  viewerId,
  onClose,
}: ProfilePopupProps) {
  const [user, setUser] = useState<ProfileUser | null>(null)
  const [mutuals, setMutuals] = useState<MutualFriend[]>([])
  const [friendStatus, setFriendStatus] = useState<
    'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'ACCEPTED'
  >('NONE')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const { t, tWith } = useTranslation()

  const isSelf = userId === viewerId

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [userRes, myFriendsRes, targetFriendsRes] = await Promise.all([
        apiFetch(`${API_URL}/api/?id=${userId}`),
        viewerId
          ? apiFetch(`${API_URL}/api/users/${viewerId}/friends`)
          : Promise.resolve(null),
        apiFetch(`${API_URL}/api/users/${userId}/friends?status=ACCEPTED`)
      ])

      if (userRes.ok) {
        const userData = await userRes.json()
        setUser(userData)
      }

      // Determine friend status
      if (myFriendsRes && myFriendsRes.ok) {
        const myFriendsData = await myFriendsRes.json()
        const rel = myFriendsData.find(
          (f: { userId: string; friendId: string; status: string }) =>
            f.userId === userId || f.friendId === userId
        )
        if (rel) {
          if (rel.status === 'ACCEPTED') setFriendStatus('ACCEPTED')
          else if (rel.status === 'PENDING' && rel.userId === viewerId)
            setFriendStatus('PENDING_SENT')
          else if (rel.status === 'PENDING' && rel.friendId === viewerId)
            setFriendStatus('PENDING_RECEIVED')
        }
      }

      // Compute mutual friends (intersection of viewer friends and target friends)
      if (targetFriendsRes.ok && myFriendsRes && myFriendsRes.ok) {
        const [targetFriendsData, myFriendsData2] = await Promise.all([
          targetFriendsRes.json(),
          // We already consumed myFriendsRes above — re-fetch
          apiFetch(
            `${API_URL}/api/users/${viewerId}/friends?status=ACCEPTED`
          ).then((r) => (r.ok ? r.json() : []))
        ])

        const myFriendIds = new Set<string>(
          myFriendsData2.map((f: { userId: string; friendId: string }) =>
            f.userId === viewerId ? f.friendId : f.userId
          )
        )

        const targetFriendUsers: MutualFriend[] = targetFriendsData
          .map(
            (f: {
              userId: string
              friendId: string
              user: MutualFriend
              friend: MutualFriend
            }) => (f.userId === userId ? f.friend : f.user)
          )
          .filter((u: MutualFriend) => u.id !== userId && u.id !== viewerId)

        setMutuals(targetFriendUsers.filter((u) => myFriendIds.has(u.id)))
      }
    } catch (err) {
      console.error('ProfilePopup fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, viewerId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleAddFriend() {
    setActionLoading(true)
    try {
      const res = await apiFetch(`${API_URL}/api/users/${viewerId}/friends`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: userId })
      })
      if (!res.ok) {
        alert('Błąd')
        return
      }
      setFriendStatus('PENDING_SENT')
    } catch {
      alert('Błąd')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleAcceptFriend() {
    setActionLoading(true)
    try {
      const res = await apiFetch(
        `${API_URL}/api/users/${viewerId}/friends/${userId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ACCEPTED' })
        }
      )
      if (!res.ok) {
        alert('Błąd')
        return
      }
      setFriendStatus('ACCEPTED')
      // Automatically create a private chat with the new friend
      try {
        const chatsRes = await apiFetch(`${API_URL}/api/users/${viewerId}/chats`)
        if (chatsRes.ok) {
          const chats = await chatsRes.json()
          const existing = chats.find(
            (c: { type: string; users: { userId: string }[] }) =>
              c.type === 'PRIVATE' && c.users.some((u: { userId: string }) => u.userId === userId)
          )
          if (!existing) {
            await apiFetch(`${API_URL}/api/chats`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'PRIVATE', userIds: [viewerId, userId] })
            })
          }
        }
      } catch {
        /* best-effort: chat creation failure shouldn't block friend accept */
      }
    } catch {
      alert('Błąd')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className={styles.Overlay}>
      <div className={styles.Backdrop} onClick={onClose} />
      <div className={styles.Popup}>
        <div className={styles.Banner}>
          <button
            className={styles.CloseBtn}
            onClick={onClose}
            aria-label="Zamknij"
          >
            ✕
          </button>
          <div className={styles.AvatarWrap}>
            {loading ? (
              <div className={styles.AvatarSkeleton} />
            ) : (
              <>
                <img
                  src={avatarSrc(user?.avatarUrl)}
                  alt={user?.nickname ?? ''}
                  width={80}
                  height={80}
                  className={styles.Avatar}
                />
                <span
                  className={styles.StatusRing}
                  style={{
                    background: user ? STATUS_COLOR[user.status] : '#7f8c8d'
                  }}
                />
              </>
            )}
          </div>
        </div>

        <div className={styles.Body}>
          {loading ? (
            <div className={styles.SkeletonBlock}>
              <div
                className={styles.SkeletonLine}
                style={{ width: '60%', height: '2rem', marginBottom: '0.6rem' }}
              />
              <div
                className={styles.SkeletonLine}
                style={{ width: '40%', height: '1.4rem' }}
              />
            </div>
          ) : user ? (
            <>
              <h2 className={styles.Name}>{user.nickname}</h2>
              {user.username && (
                <p className={styles.Username}>@{user.username}</p>
              )}

              <div className={styles.StatusBadge}>
                <span
                  className={styles.StatusDot}
                  style={{ background: STATUS_COLOR[user.status] }}
                />
                <span style={{ color: STATUS_COLOR[user.status] }}>
                  {t(`status.${user.status}` as Parameters<typeof t>[0])}
                </span>
              </div>

              {user.bio && (
                <>
                  <div className={styles.Divider} />
                  <div className={styles.Section}>
                    <div className={styles.SectionLabel}>
                      {t('profilePopup.about')}
                    </div>
                    <div className={styles.MetaItem}>
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                      >
                        <path
                          d="M8 1C4.13 1 1 4.13 1 8s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm0 2a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 10c-1.75 0-3.29-.9-4.2-2.26C3.8 9.5 6.27 8.5 8 8.5s4.2 1 4.2 2.24C11.29 12.1 9.75 13 8 13z"
                          fill="currentColor"
                        />
                      </svg>
                      {user.bio}
                    </div>
                  </div>
                </>
              )}

              {user.joinedAt && (
                <>
                  <div className={styles.Divider} />
                  <div className={styles.Section}>
                    <div className={styles.SectionLabel}>
                      {t('profilePopup.details')}
                    </div>
                    <div className={styles.MetaItem}>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <rect
                          x="2"
                          y="3"
                          width="12"
                          height="11"
                          rx="1.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M5 2v2M11 2v2M2 7h12"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      {tWith('profilePopup.joinedAt', {
                        date: new Date(user.joinedAt).toLocaleDateString()
                      })}
                    </div>
                  </div>
                </>
              )}

              {!isSelf && (
                <>
                  <div className={styles.Divider} />
                  <div className={styles.Section}>
                    <div className={styles.SectionLabel}>
                      {tWith('profilePopup.mutuals', { count: mutuals.length })}
                    </div>
                    {mutuals.length > 0 ? (
                      <div className={styles.MutualsList}>
                        {mutuals.map((mf) => (
                          <div key={mf.id} className={styles.MutualItem}>
                            <div className={styles.MutualAvatarWrap}>
                              <img
                                src={avatarSrc(mf.avatarUrl)}
                                alt={mf.nickname}
                                width={26}
                                height={26}
                                className={styles.MutualAvatar}
                              />
                              <span
                                className={styles.MutualStatusDot}
                                style={{ background: STATUS_COLOR[mf.status] }}
                              />
                            </div>
                            <span className={styles.MutualName}>
                              {mf.nickname}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.MutualsEmpty}>
                        {t('profilePopup.noMutuals')}
                      </p>
                    )}
                  </div>
                </>
              )}

              {!isSelf && (
                <>
                  <div className={styles.Divider} />
                  <div className={styles.Actions}>
                    {friendStatus === 'NONE' && (
                      <button
                        className={`${styles.ActionBtn} ${styles.ActionBtnSecondary}`}
                        onClick={handleAddFriend}
                        disabled={actionLoading}
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <circle
                            cx="8"
                            cy="7"
                            r="4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M1 17c0-3.3 3.1-6 7-6"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                          <path
                            d="M15 12v6M12 15h6"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                        {t('profilePopup.addFriend')}
                      </button>
                    )}

                    {friendStatus === 'PENDING_SENT' && (
                      <button
                        className={`${styles.ActionBtn} ${styles.ActionBtnSecondary} ${styles.ActionBtnDisabled}`}
                        disabled
                      >
                        {t('profilePopup.pendingSent')}
                      </button>
                    )}

                    {friendStatus === 'PENDING_RECEIVED' && (
                      <button
                        className={`${styles.ActionBtn} ${styles.ActionBtnSecondary}`}
                        onClick={handleAcceptFriend}
                        disabled={actionLoading}
                      >
                        <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                          <circle cx="8" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M1 17c0-3.3 3.1-6 7-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M13 14l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {t('profilePopup.acceptFriend')}
                      </button>
                    )}

                    {friendStatus === 'ACCEPTED' && (
                      <button
                        className={`${styles.ActionBtn} ${styles.ActionBtnSecondary} ${styles.ActionBtnFriends}`}
                        disabled
                      >
                        {t('profilePopup.alreadyFriend')}
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            <p className={styles.ErrorText}>{t('profilePopup.loadError')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
