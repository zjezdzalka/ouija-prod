'use client'

import { useRef, useState, useCallback } from 'react'
import styles from './Chats.module.scss'
import {
  Chat,
  UserStatus,
  UserSearchResult,
  STATUS_COLOR,
  avatarSrc
} from './types'
import { useTranslation } from '@/i18n/translations'
import { apiFetch } from '@utils/auth'

interface Props {
  userId: string
  chats: Chat[]
  activeChatId: string | null
  myStatus: UserStatus
  showStatusMenu: boolean
  setShowStatusMenu: (v: boolean) => void
  onStatusChange: (s: UserStatus) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  searchOpen: boolean
  setSearchOpen: (v: boolean) => void
  searchLoading: boolean
  searchUsers: UserSearchResult[]
  filteredChats: Chat[]
  newPeopleResults: UserSearchResult[]
  sentInvites: Set<string>
  loadingChats: boolean
  mutedChatIds: Set<string>
  onToggleMute: (chatId: string) => void
  onSelectChat: (id: string) => void
  onOpenProfile: (id: string) => void
  onOpenGroupInfo: (chatId: string) => void
  onSendInvite: (id: string) => void
  isMobileHidden?: boolean
  onCreateGroupChat: (name: string, memberIds: string[]) => Promise<void>
}

function getChatDisplayName(chat: Chat, userId: string): string {
  if (chat.name) return chat.name
  return chat.users.find((u) => u.userId !== userId)?.user.nickname ?? 'Chat'
}

export default function ChatSidebar({
  userId,
  chats,
  activeChatId,
  myStatus,
  showStatusMenu,
  setShowStatusMenu,
  onStatusChange,
  searchQuery,
  setSearchQuery,
  setSearchOpen,
  searchLoading,
  filteredChats,
  newPeopleResults,
  sentInvites,
  loadingChats,
  mutedChatIds,
  onToggleMute,
  onSelectChat,
  onOpenProfile,
  onOpenGroupInfo,
  onSendInvite,
  isMobileHidden,
  onCreateGroupChat
}: Props) {
  const { t, lang } = useTranslation()
  const searchInputRef = useRef<HTMLInputElement>(null)

  // ── Czat grupowy ──
  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupSearch, setGroupSearch] = useState('')
  const [groupSearchResults, setGroupSearchResults] = useState<
    UserSearchResult[]
  >([])
  const [groupSearchLoading, setGroupSearchLoading] = useState(false)
  const [groupMembers, setGroupMembers] = useState<UserSearchResult[]>([])
  const [groupCreating, setGroupCreating] = useState(false)
  const groupSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Add Friend Modal ──
  const [addFriendModalOpen, setAddFriendModalOpen] = useState(false)
  const [addFriendSearch, setAddFriendSearch] = useState('')

  function openAddFriendModal() {
    setAddFriendModalOpen(true)
    setAddFriendSearch('')
  }

  function openGroupModal() {
    setGroupModalOpen(true)
    setGroupName('')
    setGroupSearch('')
    setGroupSearchResults([])
    setGroupMembers([])
  }

  function toggleMember(person: UserSearchResult) {
    setGroupMembers((prev) => {
      if (prev.some((m) => m.id === person.id))
        return prev.filter((m) => m.id !== person.id)
      if (prev.length >= 9) {
        alert('A group can have at most 10 members (you + 9 others).')
        return prev
      }
      return [...prev, person]
    })
  }

  const handleGroupSearch = useCallback(
    (q: string) => {
      setGroupSearch(q)
      if (groupSearchTimer.current) clearTimeout(groupSearchTimer.current)
      if (!q.trim()) {
        setGroupSearchResults([])
        return
      }
      groupSearchTimer.current = setTimeout(async () => {
        setGroupSearchLoading(true)
        try {
          const API_URL =
            process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          const res = await apiFetch(`${API_URL}/api/?q=${encodeURIComponent(q)}`)
          if (res.ok) {
            const data: UserSearchResult[] = await res.json()
            setGroupSearchResults(data.filter((u) => u.id !== userId))
          }
        } catch {
          /* ignoruj */
        } finally {
          setGroupSearchLoading(false)
        }
      }, 300)
    },
    [userId]
  )

  async function handleCreateGroup() {
    if (!groupName.trim() || groupCreating) return
    if (groupMembers.length < 2) {
      alert(
        'A group chat needs at least 3 members (you + 2 others). Please add at least 2 people.'
      )
      return
    }
    setGroupCreating(true)
    try {
      await onCreateGroupChat(
        groupName.trim(),
        groupMembers.map((m) => m.id)
      )
      setGroupModalOpen(false)
    } finally {
      setGroupCreating(false)
    }
  }

  const STATUS_KEYS: UserStatus[] = ['ONLINE', 'AWAY', 'BUSY', 'OFFLINE']

  function getLastMessagePreview(chat: Chat): string {
    const msg = chat.lastMessage
    if (!msg) return ''
    const isOwn = msg.senderId === userId
    const attachment = t('chat.attachment')
    const content = msg.content ?? attachment
    // Private chats: no sender name, just "Ty: " prefix for own messages
    if (chat.type === 'PRIVATE') {
      return isOwn ? `${t('chat.sentByMe')}: ${content}` : content
    }
    // Group chats: keep sender name prefix
    if (isOwn) return `${t('chat.sentByMe')}: ${content}`
    const sender =
      chat.users.find((u) => u.userId === msg.senderId)?.user.nickname ?? ''
    return `${sender}: ${content}`
  }

  // Lokalizacja czasu — pl-PL albo en-GB zależnie od języka
  const timeLocale = lang === 'en' ? 'en-GB' : 'pl-PL'

  return (
    <div
      className={`${styles.Contacts}${isMobileHidden ? ` ${styles.ContactsHidden}` : ''}`}
    >
      {/* ── Status ── */}
      <div
        className={styles.MyStatus}
        onClick={() => setShowStatusMenu(!showStatusMenu)}
      >
        <span
          className={styles.StatusDot}
          style={{ background: STATUS_COLOR[myStatus] }}
        />
        <span className={styles.StatusLabel}>
          {t(`status.${myStatus}` as never)}
        </span>
        <span className={styles.StatusChevron}>▾</span>
      </div>

      {showStatusMenu && (
        <div className={styles.StatusMenu}>
          {STATUS_KEYS.map((s) => (
            <button
              key={s}
              className={`${styles.StatusMenuBtn} ${myStatus === s ? styles.StatusMenuBtnActive : ''}`}
              onClick={() => onStatusChange(s)}
            >
              <span
                className={styles.StatusDot}
                style={{ background: STATUS_COLOR[s] }}
              />
              {t(`status.${s}` as never)}
            </button>
          ))}
        </div>
      )}

      {/* ── Modal tworzenia grupy ── */}
      {groupModalOpen && (
        <div
          className={styles.ModalOverlay}
          onClick={() => setGroupModalOpen(false)}
        >
          <div className={styles.Modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.ModalHeader}>
              <h3 className={styles.ModalTitle}>Nowy czat grupowy</h3>
              <button
                className={styles.ModalClose}
                onClick={() => setGroupModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.ModalBody}>
              <input
                type="text"
                className={styles.ModalInput}
                placeholder="Nazwa grupy (maks. 50 znaków)"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value.slice(0, 50))}
                maxLength={50}
                autoFocus
              />
              <p className={styles.ModalHint} style={{ textAlign: 'right', marginBottom: '0.4rem' }}>
                {groupName.length}/50
              </p>
              <p
                className={styles.ModalHint}
                style={{ marginBottom: '0.4rem' }}
              >
                Dodaj min. 2 osoby (wymagane minimum 3 uczestników łącznie z
                tobą)
              </p>

              <input
                type="text"
                className={styles.ModalInput}
                placeholder="Szukaj użytkowników..."
                value={groupSearch}
                onChange={(e) => handleGroupSearch(e.target.value)}
              />

              {groupSearchLoading && (
                <p className={styles.ModalHint}>Szukam...</p>
              )}

              {groupSearchResults.length > 0 && (
                <div className={styles.ModalSearchResults}>
                  {groupSearchResults.map((person) => {
                    const selected = groupMembers.some(
                      (m) => m.id === person.id
                    )
                    return (
                      <div
                        key={person.id}
                        className={`${styles.ModalSearchItem} ${selected ? styles.ModalSearchItemSelected : ''}`}
                        onClick={() => toggleMember(person)}
                      >
                        <img
                          src={avatarSrc(person.avatarUrl)}
                          alt="avatar"
                          width={28}
                          height={28}
                          className={styles.ContactsChatPreviewProfilePicture}
                        />
                        <span className={styles.ModalSearchItemName}>
                          {person.nickname}
                        </span>
                        {selected && (
                          <span className={styles.ModalCheckmark}>✓</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {groupMembers.length > 0 && (
                <div className={styles.ModalMembers}>
                  <p className={styles.ModalHint}>
                    Wybrani ({groupMembers.length}):
                  </p>
                  <div className={styles.ModalMemberChips}>
                    {groupMembers.map((m) => (
                      <span key={m.id} className={styles.ModalChip}>
                        {m.nickname}
                        <button
                          className={styles.ModalChipRemove}
                          onClick={() => toggleMember(m)}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.ModalFooter}>
              <button
                className={styles.ModalCancelBtn}
                onClick={() => setGroupModalOpen(false)}
              >
                Anuluj
              </button>
              <button
                className={styles.ModalConfirmBtn}
                onClick={handleCreateGroup}
                disabled={
                  !groupName.trim() || groupMembers.length < 2 || groupCreating
                }
              >
                {groupCreating ? 'Tworzę...' : 'Utwórz grupę'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal dodawania znajomego ── */}
      {addFriendModalOpen && (
        <div
          className={styles.ModalOverlay}
          onClick={() => setAddFriendModalOpen(false)}
        >
          <div className={styles.Modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.ModalHeader}>
              <h3 className={styles.ModalTitle}>Dodaj znajomego</h3>
              <button
                className={styles.ModalClose}
                onClick={() => setAddFriendModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.ModalBody}>
              <input
                type="text"
                className={styles.ModalInput}
                placeholder="Szukaj użytkowników..."
                value={addFriendSearch}
                autoFocus
                onChange={(e) => {
                  const q = e.target.value
                  setAddFriendSearch(q)
                  setSearchQuery(q)
                  setSearchOpen(true)
                }}
              />

              {searchLoading && (
                <p className={styles.ModalHint}>Szukam...</p>
              )}

              {newPeopleResults.length > 0 && (
                <div className={styles.ModalSearchResults}>
                  {newPeopleResults.map((person) => (
                    <div key={person.id} className={styles.ModalSearchItem}>
                      <img
                        src={avatarSrc(person.avatarUrl)}
                        alt="avatar"
                        width={28}
                        height={28}
                        className={styles.ContactsChatPreviewProfilePicture}
                      />
                      <span
                        className={styles.ModalSearchItemName}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          onOpenProfile(person.id)
                          setAddFriendModalOpen(false)
                          setSearchQuery('')
                          setSearchOpen(false)
                        }}
                      >
                        {person.nickname}
                      </span>
                      <button
                          className={`${styles.SearchActionBtn} ${sentInvites.has(person.id) ? styles.SearchActionBtnSent : ''}`}
                          onClick={() => onSendInvite(person.id)}
                          disabled={sentInvites.has(person.id)}
                          title={
                            sentInvites.has(person.id)
                              ? t('chat.sentInvite')
                              : t('chat.addFriend')
                          }
                        >
                          {sentInvites.has(person.id) ? '✓' : '+'}
                        </button>
                    </div>
                  ))}
                </div>
              )}

              {!searchLoading && addFriendSearch.trim() && newPeopleResults.length === 0 && (
                <p className={styles.ModalHint}>Nie znaleziono nowych użytkowników.</p>
              )}
            </div>

            <div className={styles.ModalFooter}>
              <button
                className={styles.ModalCancelBtn}
                onClick={() => {
                  setAddFriendModalOpen(false)
                  setSearchQuery('')
                  setSearchOpen(false)
                }}
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Wyszukiwarka ── */}
      <div className={styles.SearchSection}>
        <div className={styles.SearchRow}>
          <div className={`${styles.SearchWrap} ${styles.SearchRowSearch}`}>
          <input
            ref={searchInputRef}
            type="text"
            className={styles.SearchInput}
            placeholder={t('chat.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-search-input
          />
          {searchQuery && (
            <button
              className={styles.SearchClear}
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
          </div>
          <button
            className={styles.AddFriendIconBtn}
            onClick={openAddFriendModal}
            title="Dodaj znajomego"
          >
            ➕
          </button>
          <button
            className={styles.NewGroupIconBtn}
            onClick={openGroupModal}
            title="Nowa grupa"
          >
            👥
          </button>
        </div>


      </div>

      {/* ── Lista czatów ── */}
      {loadingChats && (
        <p className={styles.LoadingText}>{t('chat.loading')}</p>
      )}

      {(searchQuery.trim() ? filteredChats : chats).map((chat) => {
          const other = chat.users.find((u) => u.userId !== userId)?.user
          const lastMsg = getLastMessagePreview(chat)
          const unread = chat.unreadCount ?? 0
          const isMuted = mutedChatIds.has(chat.id)

          return (
            <div
              key={chat.id}
              className={`${styles.ContactsChatPreview} ${chat.id === activeChatId ? styles.ContactsChatPreviewActive : ''} ${unread > 0 && chat.id !== activeChatId ? styles.ContactsChatPreviewUnread : ''}`}
              onClick={() => onSelectChat(chat.id)}
            >
              <div
                className={styles.AvatarWrap}
                onClick={(e) => {
                  e.stopPropagation()
                  if (chat.type === 'GROUP') {
                    onOpenGroupInfo(chat.id)
                  } else if (other) {
                    onOpenProfile(other.id)
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                {chat.type === 'GROUP' ? (
                  <svg
                    viewBox="0 0 30 30"
                    width="30"
                    height="30"
                    xmlns="http://www.w3.org/2000/svg"
                    className={styles.ContactsChatPreviewProfilePicture}
                  >
                    <circle cx="15" cy="15" r="15" fill="var(--bg-elevated)" />
                    <circle cx="11" cy="12" r="4" fill="var(--text-muted)" />
                    <circle
                      cx="19"
                      cy="12"
                      r="4"
                      fill="var(--text-muted)"
                      opacity="0.7"
                    />
                    <path
                      d="M3 24 Q3 18 11 18 Q15 18 17 20 Q12 20 12 24 Z"
                      fill="var(--text-muted)"
                    />
                    <path
                      d="M13 22 Q14 17 19 17 Q25 17 27 22 L27 24 Q24 20 19 20 Q14 20 13 23 Z"
                      fill="var(--text-muted)"
                      opacity="0.7"
                    />
                  </svg>
                ) : (
                  <>
                    <img
                      src={avatarSrc(other?.avatarUrl)}
                      alt="avatar"
                      height={30}
                      width={30}
                      className={styles.ContactsChatPreviewProfilePicture}
                    />
                    {other && (
                      <span
                        className={styles.StatusDotSmall}
                        style={{ background: STATUS_COLOR[other.status] }}
                      />
                    )}
                  </>
                )}
              </div>

              <div className={styles.ContactsChatPreviewMessageContainer}>
                <div className={styles.ContactsChatPreviewTop}>
                  <h4
                    className={`${styles.ContactsChatPreviewMessageContainerName} ${unread > 0 && chat.id !== activeChatId ? styles.ChatNameUnread : ''}`}
                  >
                    {getChatDisplayName(chat, userId)}
                    {isMuted && (
                      <span
                        className={styles.MutedIcon}
                        title={t('chat.muted')}
                      >
                        🔇
                      </span>
                    )}
                  </h4>
                  <div className={styles.ChatPreviewTopRight}>
                    {chat.lastMessage && (
                      <span className={styles.ChatPreviewTime}>
                        {new Date(chat.lastMessage.sentAt).toLocaleTimeString(
                          timeLocale,
                          { hour: '2-digit', minute: '2-digit' }
                        )}
                      </span>
                    )}
                    <button
                      className={styles.MuteBtn}
                      title={isMuted ? t('chat.unmute') : t('chat.mute')}
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleMute(chat.id)
                      }}
                    >
                      {isMuted ? '🔇' : '🔔'}
                    </button>
                  </div>
                </div>
                <div className={styles.ContactsChatPreviewBottom}>
                  <p
                    className={`${styles.ContactsChatPreviewMessageContainerMessage} ${unread > 0 && chat.id !== activeChatId ? styles.LastMsgUnread : ''}`}
                  >
                    {lastMsg}
                  </p>
                  {unread > 0 && chat.id !== activeChatId && (
                    <span className={styles.UnreadBadge}>
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
    </div>
  )
}
