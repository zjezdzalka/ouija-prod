'use client'

import { useEffect } from 'react'
import styles from './GroupInfoPopup.module.scss'
import { Chat, STATUS_COLOR, avatarSrc } from '@/app/chats/types'
import { useTranslation } from '@/i18n/translations'

interface Props {
  chat: Chat
  viewerId: string
  onClose: () => void
  onOpenProfile: (userId: string) => void
  onOpenChat: (chatId: string) => void
  onRemoveMember?: (chatId: string, userId: string) => Promise<void>
}

export default function GroupInfoPopup({
  chat,
  viewerId,
  onClose,
  onOpenProfile,
  onOpenChat,
  onRemoveMember
}: Props) {
  const { t } = useTranslation()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const memberCount = chat.users.length
  const adminUser = chat.users.find((u) => u.role === 'ADMIN')
  const isAdmin = adminUser?.userId === viewerId

  return (
    <div className={styles.Overlay}>
      <div className={styles.Backdrop} onClick={onClose} />
      <div className={styles.Popup}>
        {/* ── Banner ── */}
        <div className={styles.Banner}>
          <button
            className={styles.CloseBtn}
            onClick={onClose}
            aria-label="Zamknij"
          >
            ✕
          </button>
          <div className={styles.GroupIconWrap}>
            <svg
              viewBox="0 0 56 56"
              width="56"
              height="56"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="28"
                cy="28"
                r="28"
                fill="var(--bg-elevated, #2a2826)"
              />
              <circle cx="20" cy="22" r="8" fill="var(--text-muted, #7a7672)" />
              <circle
                cx="36"
                cy="22"
                r="8"
                fill="var(--text-muted, #7a7672)"
                opacity="0.7"
              />
              <path
                d="M4 46 Q4 34 20 34 Q28 34 32 38 Q24 38 24 46 Z"
                fill="var(--text-muted, #7a7672)"
              />
              <path
                d="M26 42 Q27 32 36 32 Q48 32 52 42 L52 46 Q46 38 36 38 Q26 38 26 42 Z"
                fill="var(--text-muted, #7a7672)"
                opacity="0.7"
              />
            </svg>
          </div>
        </div>

        {/* ── Body ── */}
        <div className={styles.Body}>
          <h2 className={styles.Name}>
            {chat.name ?? t('chat.groupChatLabel' as Parameters<typeof t>[0])}
          </h2>

          <div className={styles.MetaBadges}>
            <span className={styles.Badge}>
              👥 {memberCount} {t('groupPopup.members')}
            </span>
            {adminUser && (
              <span className={styles.Badge}>👑 {adminUser.user.nickname}</span>
            )}
          </div>

          {/* ── Members ── */}
          <div className={styles.Divider} />
          <div className={styles.Section}>
            <div className={styles.SectionLabel}>
              {t('groupPopup.membersLabel')}
            </div>
            <div className={styles.MemberList}>
              {chat.users.map((u) => (
                <div
                  key={u.userId}
                  className={styles.MemberRow}
                  onClick={() => {
                    if (u.userId !== viewerId) {
                      onOpenProfile(u.userId)
                      onClose()
                    }
                  }}
                  style={{
                    cursor: u.userId !== viewerId ? 'pointer' : 'default'
                  }}
                >
                  <div className={styles.MemberAvatarWrap}>
                    <img
                      src={avatarSrc(u.user.avatarUrl)}
                      alt={u.user.nickname}
                      width={32}
                      height={32}
                      className={styles.MemberAvatar}
                    />
                    <span
                      className={styles.MemberStatusDot}
                      style={{
                        background:
                          STATUS_COLOR[
                            u.user.status as keyof typeof STATUS_COLOR
                          ] ?? '#7f8c8d'
                      }}
                    />
                  </div>
                  <div className={styles.MemberInfo}>
                    <span className={styles.MemberName}>
                      {u.user.nickname}
                      {u.userId === viewerId && (
                        <span className={styles.YouBadge}>
                          {' '}
                          ({t('groupPopup.you')})
                        </span>
                      )}
                    </span>
                    <span
                      className={styles.MemberStatus}
                      style={{
                        color:
                          STATUS_COLOR[
                            u.user.status as keyof typeof STATUS_COLOR
                          ] ?? '#7f8c8d'
                      }}
                    >
                      {t(`status.${u.user.status}` as never)}
                    </span>
                  </div>
                  {u.role === 'ADMIN' && (
                    <span className={styles.AdminBadge}>Admin</span>
                  )}
                  {isAdmin && u.userId !== viewerId && onRemoveMember && (
                    <button
                      className={styles.RemoveBtn}
                      title="Usuń z grupy"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`Usunąć ${u.user.nickname} z grupy?`)) {
                          onRemoveMember(chat.id, u.userId)
                        }
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Actions ── */}
          <div className={styles.Divider} />
          <div className={styles.Actions}>
            <button
              className={`${styles.ActionBtn} ${styles.ActionBtnPrimary}`}
              onClick={() => {
                onOpenChat(chat.id)
                onClose()
              }}
            >
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                <path
                  d="M18 2H2a1 1 0 00-1 1v12a1 1 0 001 1h4l3 3 3-3h6a1 1 0 001-1V3a1 1 0 00-1-1z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
              {t('groupPopup.openChat')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
