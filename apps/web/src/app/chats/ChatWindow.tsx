'use client'

import { FormEvent, RefObject, useEffect, useRef, useState } from 'react'
import styles from './Chats.module.scss'
import MessageBubble from './MessageBubble'
import { Chat, Message, ReactionType, STATUS_COLOR, avatarSrc, API_URL } from './types'
import { useTranslation } from '@/i18n/translations'
import { apiFetch } from '@utils/auth'

interface Props {
  activeChat: Chat | null
  otherUser: {
    id: string
    nickname: string
    status: string
    avatarUrl?: string | null
  } | null
  userId: string
  messages: Message[]
  loadingMessages: boolean
  loadingMore: boolean
  messageText: string
  setMessageText: (v: string) => void
  pendingFiles: File[]
  setPendingFiles: (fn: (prev: File[]) => File[]) => void
  sending: boolean
  bottomRef: RefObject<HTMLDivElement | null>
  topSentinelRef: RefObject<HTMLDivElement | null>
  messageContainerRef: RefObject<HTMLDivElement | null>
  fileInputRef: RefObject<HTMLInputElement | null>
  onSendMessage: (e: FormEvent) => void
  onReact: (messageId: string, type: ReactionType) => void
  onOpenProfile: (id: string) => void
  getChatDisplayName: (chat: Chat) => string
  onBack?: () => void
  isMobileChatVisible?: boolean
  onRenameGroup: (chatId: string, name: string) => Promise<void>
  onDeleteGroup: (chatId: string) => Promise<void>
  onTransferOwner: (chatId: string, newOwnerId: string) => Promise<void>
  onRemoveMember: (chatId: string, memberId: string) => Promise<void>
  onAddMember: (chatId: string, userId: string) => Promise<void>
  onUpgradeToGroup: (
    chatId: string,
    name: string,
    memberIds: string[]
  ) => Promise<void>
  friendIds: Set<string>
  allChats: Chat[]
  currentUserId?: string
  typingUsers?: {
    userId: string
    nickname: string
    avatarUrl?: string | null
  }[]
  onTypingChange?: (isTyping: boolean) => void
  onPasteFile?: (file: File) => void
}

export default function ChatWindow({
  activeChat,
  otherUser,
  userId,
  messages,
  loadingMessages,
  loadingMore,
  messageText,
  setMessageText,
  pendingFiles,
  setPendingFiles,
  sending,
  bottomRef,
  topSentinelRef,
  messageContainerRef,
  onSendMessage,
  onReact,
  onOpenProfile,
  getChatDisplayName,
  onBack,
  isMobileChatVisible,
  onRenameGroup,
  onDeleteGroup,
  onTransferOwner,
  onRemoveMember,
  onAddMember,
  onUpgradeToGroup,
  typingUsers = [],
  onTypingChange,
  onPasteFile
}: Props) {
  const { t } = useTranslation()
  const [groupPanelOpen, setGroupPanelOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [addMemberSearch, setAddMemberSearch] = useState('')

  // ── Chat message search ──
  const [chatSearchOpen, setChatSearchOpen] = useState(false)
  const [chatSearchQuery, setChatSearchQuery] = useState('')
  const [chatSearchIndex, setChatSearchIndex] = useState(0)
  const chatSearchInputRef = useRef<HTMLInputElement>(null)

  const chatSearchMatches = chatSearchQuery.trim()
    ? messages
        .map((m, i) => ({ i, m }))
        .filter(({ m }) =>
          m.content?.toLowerCase().includes(chatSearchQuery.toLowerCase())
        )
        .map(({ i }) => i)
    : []

  function openChatSearch() {
    setChatSearchOpen(true)
    setChatSearchQuery('')
    setChatSearchIndex(0)
    setTimeout(() => chatSearchInputRef.current?.focus(), 50)
  }

  function closeChatSearch() {
    setChatSearchOpen(false)
    setChatSearchQuery('')
  }

  function chatSearchPrev() {
    setChatSearchIndex((i) => Math.max(0, i - 1))
  }

  function chatSearchNext() {
    setChatSearchIndex((i) => Math.min(chatSearchMatches.length - 1, i + 1))
  }
  const [addMemberResults, setAddMemberResults] = useState<
    { id: string; nickname: string; avatarUrl?: string | null }[]
  >([])
  const [addMemberLoading, setAddMemberLoading] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [upgradeGroupName, setUpgradeGroupName] = useState('')
  const [upgradeExtraMembers, setUpgradeExtraMembers] = useState<
    { id: string; nickname: string; avatarUrl?: string | null }[]
  >([])
  const [upgradeSearch, setUpgradeSearch] = useState('')
  const [upgradeSearchResults, setUpgradeSearchResults] = useState<
    { id: string; nickname: string; avatarUrl?: string | null }[]
  >([])
  const [upgradeSearchLoading, setUpgradeSearchLoading] = useState(false)
  const addMemberTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const upgradeSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const GROUP_MAX_MEMBERS = 10

  // ── Ctrl+V paste images from clipboard ──
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      if (!activeChat) return
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file && onPasteFile) onPasteFile(file)
        }
      }
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [activeChat, onPasteFile])

  // ── Drag & drop files onto the chat window ──
  useEffect(() => {
    function handleDragOver(e: DragEvent) {
      if (!activeChat) return
      const hasFiles = Array.from(e.dataTransfer?.items ?? []).some(
        (i) => i.kind === 'file'
      )
      if (!hasFiles) return
      e.preventDefault()
      setIsDragging(true)
    }
    function handleDragLeave(e: DragEvent) {
      // Only clear when leaving the window entirely
      if (e.relatedTarget == null) setIsDragging(false)
    }
    function handleDrop(e: DragEvent) {
      e.preventDefault()
      setIsDragging(false)
      if (!activeChat || !onPasteFile) return
      const files = Array.from(e.dataTransfer?.files ?? [])
      files.forEach((file) => onPasteFile(file))
    }
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('drop', handleDrop)
    }
  }, [activeChat, onPasteFile])

  // ── Ctrl+F — szukaj w czacie ──
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && activeChat) {
        e.preventDefault()
        openChatSearch()
      }
      if (e.key === 'Escape' && chatSearchOpen) {
        closeChatSearch()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeChat, chatSearchOpen])

  const isGroupAdmin =
    activeChat?.type === 'GROUP' &&
    activeChat.users.find((u) => u.userId === userId)?.role === 'ADMIN'

  const atMemberCap =
    activeChat?.type === 'GROUP' &&
    (activeChat.users.length ?? 0) >= GROUP_MAX_MEMBERS

  // Search FRIENDS of current user to add to group
  function handleAddMemberSearch(q: string) {
    setAddMemberSearch(q)
    if (addMemberTimer.current) clearTimeout(addMemberTimer.current)
    if (!q.trim()) {
      setAddMemberResults([])
      return
    }
    addMemberTimer.current = setTimeout(async () => {
      setAddMemberLoading(true)
      try {
        const res = await apiFetch(
          `${API_URL}/api/users/${userId}/friends?status=ACCEPTED`
        )
        if (res.ok) {
          const data: {
            userId: string
            friendId: string
            user: { id: string; nickname: string; avatarUrl?: string | null }
            friend: { id: string; nickname: string; avatarUrl?: string | null }
          }[] = await res.json()
          const existingIds = new Set(
            activeChat?.users.map((u) => u.userId) ?? []
          )
          const friends = data
            .map((f) => (f.userId === userId ? f.friend : f.user))
            .filter((u) => u.id !== userId && !existingIds.has(u.id))
          const lower = q.toLowerCase()
          setAddMemberResults(
            friends.filter((u) => u.nickname.toLowerCase().includes(lower))
          )
        }
      } catch {
        /* ignore */
      } finally {
        setAddMemberLoading(false)
      }
    }, 200)
  }

  // Search FRIENDS of current user when upgrading private → group
  function handleUpgradeSearch(q: string) {
    setUpgradeSearch(q)
    if (upgradeSearchTimer.current) clearTimeout(upgradeSearchTimer.current)
    if (!q.trim()) {
      setUpgradeSearchResults([])
      return
    }
    upgradeSearchTimer.current = setTimeout(async () => {
      setUpgradeSearchLoading(true)
      try {
        const res = await apiFetch(
          `${API_URL}/api/users/${userId}/friends?status=ACCEPTED`
        )
        if (res.ok) {
          const data: {
            userId: string
            friendId: string
            user: { id: string; nickname: string; avatarUrl?: string | null }
            friend: { id: string; nickname: string; avatarUrl?: string | null }
          }[] = await res.json()
          const alreadyAdded = new Set([
            userId,
            otherUser?.id ?? '',
            ...upgradeExtraMembers.map((m) => m.id)
          ])
          const friends = data
            .map((f) => (f.userId === userId ? f.friend : f.user))
            .filter((u) => !alreadyAdded.has(u.id))
          const lower = q.toLowerCase()
          setUpgradeSearchResults(
            friends.filter((u) => u.nickname.toLowerCase().includes(lower))
          )
        }
      } catch {
        /* ignore */
      } finally {
        setUpgradeSearchLoading(false)
      }
    }, 200)
  }

  function toggleUpgradeMember(person: {
    id: string
    nickname: string
    avatarUrl?: string | null
  }) {
    setUpgradeExtraMembers((prev) =>
      prev.some((m) => m.id === person.id)
        ? prev.filter((m) => m.id !== person.id)
        : [...prev, person]
    )
  }

  async function handleConfirmUpgrade() {
    if (!activeChat || !upgradeGroupName.trim()) return
    if (upgradeExtraMembers.length === 0) {
      alert(
        'A group chat needs at least 3 members. Please add at least one more person.'
      )
      return
    }
    // current user + other user + extras
    const total = 2 + upgradeExtraMembers.length
    if (total > GROUP_MAX_MEMBERS) {
      alert(`A group can have at most ${GROUP_MAX_MEMBERS} members.`)
      return
    }
    await onUpgradeToGroup(
      activeChat.id,
      upgradeGroupName.trim(),
      upgradeExtraMembers.map((m) => m.id)
    )
    setUpgradeModalOpen(false)
    setUpgradeGroupName('')
    setUpgradeExtraMembers([])
    setUpgradeSearch('')
    setUpgradeSearchResults([])
  }

  if (!activeChat) {
    return (
      <div className={styles.Chat}>
        <p className={styles.NoChatSelected}>{t('chat.noChat')}</p>
      </div>
    )
  }

  return (
    <div
      className={`${styles.Chat}${isMobileChatVisible ? ` ${styles.ChatVisible}` : ''}${isDragging ? ` ${styles.ChatDragOver}` : ''}`}
    >
      {isDragging && (
        <div className={styles.DragOverlay}>
          <div className={styles.DragOverlayInner}>
            📎 Upuść plik tutaj
          </div>
        </div>
      )}
      {/* ── Nagłówek ── */}
      <div className={styles.ChatContactInfo}>
        {onBack && (
          <button
            className={styles.BackButton}
            onClick={onBack}
            aria-label="Wróć do listy czatów"
          >
            ←
          </button>
        )}
        <div className={styles.ChatContactInfoLeft}>
          {activeChat.type === 'GROUP' ? (
            <>
              <div className={styles.GroupIconWrap}>
                <svg
                  viewBox="0 0 36 36"
                  width="36"
                  height="36"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="18" cy="18" r="18" fill="var(--bg-elevated)" />
                  <circle cx="13" cy="14" r="5" fill="var(--text-muted)" />
                  <circle
                    cx="23"
                    cy="14"
                    r="5"
                    fill="var(--text-muted)"
                    opacity="0.7"
                  />
                  <path
                    d="M4 28 Q4 22 13 22 Q18 22 20 24 Q15 24 15 28 Z"
                    fill="var(--text-muted)"
                  />
                  <path
                    d="M16 26 Q17 21 23 21 Q30 21 32 27 L32 28 Q29 24 23 24 Q17 24 16 28 Z"
                    fill="var(--text-muted)"
                    opacity="0.7"
                  />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h2 className={styles.ChatContactName}>
                  {getChatDisplayName(activeChat)}
                </h2>
                <h5 className={styles.ChatContactStatus}>
                  {activeChat.users.map((u) => u.user.nickname).join(', ')}
                </h5>
              </div>
            </>
          ) : (
            <>
              <div
                className={styles.AvatarWrap}
                style={{ cursor: 'pointer' }}
                onClick={() => otherUser && onOpenProfile(otherUser.id)}
              >
                <img
                  src={avatarSrc(otherUser?.avatarUrl)}
                  alt="avatar"
                  height={36}
                  width={36}
                  className={styles.ContactsChatPreviewProfilePicture}
                />
                {otherUser && (
                  <span
                    className={styles.StatusDotSmall}
                    style={{
                      background:
                        STATUS_COLOR[
                          otherUser.status as keyof typeof STATUS_COLOR
                        ] ?? '#7f8c8d'
                    }}
                  />
                )}
              </div>
              <div>
                <h2 className={styles.ChatContactName}>
                  {getChatDisplayName(activeChat)}
                </h2>
                {otherUser && (
                  <h5
                    className={styles.ChatContactStatus}
                    style={{
                      color:
                        STATUS_COLOR[
                          otherUser.status as keyof typeof STATUS_COLOR
                        ] ?? '#7f8c8d'
                    }}
                  >
                    {t(`status.${otherUser.status}` as never)}
                  </h5>
                )}
              </div>
            </>
          )}
        </div>
        {/* ── Szukaj w czacie ── */}
        <button
          className={`${styles.GroupSettingsBtn} ${chatSearchOpen ? styles.GroupSettingsBtnActive : ''}`}
          onClick={() => chatSearchOpen ? closeChatSearch() : openChatSearch()}
          title="Szukaj w wiadomościach (Ctrl+F)"
        >
          🔍
        </button>
        {activeChat?.type === 'GROUP' && (
          <button
            className={`${styles.GroupSettingsBtn} ${groupPanelOpen ? styles.GroupSettingsBtnActive : ''}`}
            onClick={() => setGroupPanelOpen((v) => !v)}
            title="Ustawienia grupy"
          >
            ⚙️
          </button>
        )}
        {activeChat?.type === 'PRIVATE' && (
          <button
            className={styles.GroupSettingsBtn}
            onClick={() => {
              setUpgradeGroupName('')
              setUpgradeExtraMembers([])
              setUpgradeSearch('')
              setUpgradeSearchResults([])
              setUpgradeModalOpen(true)
            }}
            title="Utwórz grupę z tego czatu"
          >
            👥+
          </button>
        )}
      </div>

      {/* ── Modal: upgrade private chat to group ── */}
      {upgradeModalOpen && (
        <div
          className={styles.ModalOverlay}
          onClick={() => setUpgradeModalOpen(false)}
        >
          <div className={styles.Modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.ModalHeader}>
              <h3 className={styles.ModalTitle}>Utwórz czat grupowy</h3>
              <button
                className={styles.ModalClose}
                onClick={() => setUpgradeModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.ModalBody}>
              <p className={styles.ModalHint}>
                Aktualnie w czacie: ty i {otherUser?.nickname}. Potrzeba min. 3
                osób.
              </p>
              <input
                type="text"
                className={styles.ModalInput}
                placeholder="Nazwa grupy"
                value={upgradeGroupName}
                onChange={(e) => setUpgradeGroupName(e.target.value)}
                autoFocus
              />
              <input
                type="text"
                className={styles.ModalInput}
                placeholder="Dodaj osoby do grupy..."
                value={upgradeSearch}
                onChange={(e) => handleUpgradeSearch(e.target.value)}
              />
              {upgradeSearchLoading && (
                <p className={styles.ModalHint}>Szukam...</p>
              )}
              {upgradeSearchResults.length > 0 && (
                <div className={styles.ModalSearchResults}>
                  {upgradeSearchResults.map((person) => {
                    const selected = upgradeExtraMembers.some(
                      (m) => m.id === person.id
                    )
                    return (
                      <div
                        key={person.id}
                        className={`${styles.ModalSearchItem} ${selected ? styles.ModalSearchItemSelected : ''}`}
                        onClick={() => toggleUpgradeMember(person)}
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
              {upgradeExtraMembers.length > 0 && (
                <div className={styles.ModalMembers}>
                  <p className={styles.ModalHint}>
                    Dodani ({upgradeExtraMembers.length}):
                  </p>
                  <div className={styles.ModalMemberChips}>
                    {upgradeExtraMembers.map((m) => (
                      <span key={m.id} className={styles.ModalChip}>
                        {m.nickname}
                        <button
                          className={styles.ModalChipRemove}
                          onClick={() => toggleUpgradeMember(m)}
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
                onClick={() => setUpgradeModalOpen(false)}
              >
                Anuluj
              </button>
              <button
                className={styles.ModalConfirmBtn}
                onClick={handleConfirmUpgrade}
                disabled={
                  !upgradeGroupName.trim() || upgradeExtraMembers.length === 0
                }
              >
                Utwórz grupę
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Panel ustawień grupy ── */}
      {groupPanelOpen && activeChat?.type === 'GROUP' && (
        <div className={styles.GroupPanel}>
          {/* Close button */}
          <div className={styles.GroupPanelCloseRow}>
            <span className={styles.GroupPanelTitle}>Ustawienia grupy</span>
            <button
              className={styles.GroupPanelBtnSecondary}
              onClick={() => setGroupPanelOpen(false)}
            >
              ✕
            </button>
          </div>

          {/* Nazwa grupy — każdy może zmienić */}
          <div className={styles.GroupPanelSection}>
            <p className={styles.GroupPanelLabel}>Nazwa grupy</p>
            {editingName ? (
              <div className={styles.GroupPanelNameEdit}>
                <input
                  className={styles.GroupPanelNameInput}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value.slice(0, 50))}
                  maxLength={50}
                  placeholder="Nazwa grupy (maks. 50 znaków)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onRenameGroup(activeChat.id, nameInput)
                      setEditingName(false)
                    }
                    if (e.key === 'Escape') setEditingName(false)
                  }}
                  autoFocus
                />
                <button
                  className={styles.GroupPanelBtn}
                  onClick={() => {
                    onRenameGroup(activeChat.id, nameInput)
                    setEditingName(false)
                  }}
                >
                  Zapisz
                </button>
                <button
                  className={styles.GroupPanelBtnSecondary}
                  onClick={() => setEditingName(false)}
                >
                  Anuluj
                </button>
              </div>
            ) : (
              <div className={styles.GroupPanelNameRow}>
                <span className={styles.GroupPanelNameText}>
                  {activeChat.name}
                </span>
                <button
                  className={styles.GroupPanelBtn}
                  onClick={() => {
                    setNameInput(activeChat.name ?? '')
                    setEditingName(true)
                  }}
                >
                  ✏️ Edytuj
                </button>
              </div>
            )}
          </div>

          {/* Dodaj członka */}
          <div className={styles.GroupPanelSection}>
            <p className={styles.GroupPanelLabel}>
              Dodaj osobę{' '}
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
                ({activeChat.users.length}/{GROUP_MAX_MEMBERS})
              </span>
            </p>
            {atMemberCap ? (
              <p
                style={{
                  fontSize: '1.1rem',
                  color: 'var(--text-muted)',
                  fontStyle: 'italic'
                }}
              >
                Grupa osiągnęła limit {GROUP_MAX_MEMBERS} członków.
              </p>
            ) : (
              <>
                <input
                  type="text"
                  className={styles.GroupPanelNameInput}
                  placeholder="Szukaj znajomych..."
                  value={addMemberSearch}
                  onChange={(e) => handleAddMemberSearch(e.target.value)}
                />
                {addMemberLoading && (
                  <p
                    style={{
                      fontSize: '1.1rem',
                      color: 'var(--text-muted)',
                      margin: '0.3rem 0'
                    }}
                  >
                    Szukam...
                  </p>
                )}
                {!addMemberLoading &&
                  addMemberSearch.trim() &&
                  addMemberResults.length === 0 && (
                    <p
                      style={{
                        fontSize: '1.1rem',
                        color: 'var(--text-muted)',
                        margin: '0.3rem 0'
                      }}
                    >
                      Brak znajomych poza grupą.
                    </p>
                  )}
                {addMemberResults.length > 0 && (
                  <div className={styles.GroupPanelAddResults}>
                    {addMemberResults.map((person) => (
                      <div
                        key={person.id}
                        className={styles.GroupPanelAddResultItem}
                      >
                        <img
                          src={avatarSrc(person.avatarUrl)}
                          alt="avatar"
                          width={24}
                          height={24}
                          className={styles.GroupPanelMemberAvatar}
                        />
                        <span className={styles.GroupPanelMemberName}>
                          {person.nickname}
                        </span>
                        <button
                          className={styles.GroupPanelBtn}
                          onClick={async () => {
                            await onAddMember(activeChat.id, person.id)
                            setAddMemberSearch('')
                            setAddMemberResults([])
                          }}
                        >
                          + Dodaj
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Członkowie */}
          <div className={styles.GroupPanelSection}>
            <p className={styles.GroupPanelLabel}>
              Członkowie ({activeChat.users.length})
            </p>
            {activeChat.users.map((u) => (
              <div key={u.userId} className={styles.GroupPanelMember}>
                <img
                  src={avatarSrc(u.user.avatarUrl)}
                  alt={u.user.nickname}
                  width={28}
                  height={28}
                  className={styles.GroupPanelMemberAvatar}
                  onClick={() => onOpenProfile(u.user.id)}
                />
                <span className={styles.GroupPanelMemberName}>
                  {u.user.nickname}
                </span>
                {u.role === 'ADMIN' && (
                  <span className={styles.GroupPanelAdminBadge}>Admin</span>
                )}
                {isGroupAdmin && u.userId !== userId && (
                  <button
                    className={styles.GroupPanelBtnDanger}
                    title="Przekaż własność"
                    onClick={() => {
                      if (
                        confirm(
                          `Przekazać własność grupy użytkownikowi ${u.user.nickname}?`
                        )
                      )
                        onTransferOwner(activeChat.id, u.userId)
                    }}
                  >
                    👑
                  </button>
                )}
                {isGroupAdmin && u.userId !== userId && (
                  <button
                    className={styles.GroupPanelBtnDanger}
                    title={`Usuń ${u.user.nickname} z grupy`}
                    onClick={() => {
                      if (confirm(`Usunąć ${u.user.nickname} z grupy?`))
                        onRemoveMember(activeChat.id, u.userId)
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Usuń grupę — tylko admin */}
          {isGroupAdmin && (
            <div className={styles.GroupPanelSection}>
              <button
                className={styles.GroupPanelBtnDangerFull}
                onClick={() => onDeleteGroup(activeChat.id)}
              >
                🗑️ Usuń grupę
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Szukaj w czacie ── */}
      {chatSearchOpen && (
        <div className={styles.ChatSearchBar}>
          <input
            ref={chatSearchInputRef}
            className={styles.ChatSearchInput}
            placeholder="Szukaj w wiadomościach…"
            value={chatSearchQuery}
            onChange={(e) => {
              setChatSearchQuery(e.target.value)
              setChatSearchIndex(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (e.shiftKey) chatSearchPrev()
                else chatSearchNext()
              }
              if (e.key === 'Escape') closeChatSearch()
            }}
          />
          <div className={styles.ChatSearchNav}>
            {chatSearchMatches.length > 0
              ? `${chatSearchIndex + 1} / ${chatSearchMatches.length}`
              : chatSearchQuery.trim()
                ? '0 wyników'
                : ''}
            <button
              className={styles.ChatSearchNavBtn}
              onClick={chatSearchPrev}
              disabled={chatSearchIndex <= 0}
              title="Poprzedni"
            >▲</button>
            <button
              className={styles.ChatSearchNavBtn}
              onClick={chatSearchNext}
              disabled={chatSearchIndex >= chatSearchMatches.length - 1}
              title="Następny"
            >▼</button>
          </div>
          <button className={styles.ChatSearchCloseBtn} onClick={closeChatSearch}>✕</button>
        </div>
      )}

      {/* ── Wiadomości ── */}
      <div className={styles.ChatMessageContainer} ref={messageContainerRef}>
        <div ref={topSentinelRef} className={styles.TopSentinel} />
        {loadingMore && (
          <p className={styles.LoadingMore}>{t('chat.loadingOlder')}</p>
        )}
        {loadingMessages && (
          <p className={styles.LoadingText}>{t('chat.loadingMessages')}</p>
        )}
        {messages.map((msg, msgIndex) => {
          const isSearchMatch =
            chatSearchOpen &&
            chatSearchQuery.trim() &&
            !!msg.content?.toLowerCase().includes(chatSearchQuery.toLowerCase())
          const isActiveMatch =
            isSearchMatch && chatSearchMatches[chatSearchIndex] === msgIndex
          return (
            <div
              key={msg.id}
              id={`msg-${msg.id}`}
              style={isActiveMatch ? { scrollMarginTop: '4rem' } : undefined}
              ref={isActiveMatch ? (el) => el?.scrollIntoView({ behavior: 'smooth', block: 'center' }) : undefined}
            >
              <MessageBubble
                msg={msg}
                isOwn={msg.senderId === userId}
                userId={userId}
                onReact={onReact}
                onOpenProfile={onOpenProfile}
                chatId={activeChat?.id}
                chatUsers={activeChat?.users ?? []}
                searchHighlight={isSearchMatch ? chatSearchQuery : undefined}
              />
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Podgląd plików ── */}
      {pendingFiles.length > 0 && (
        <div className={styles.PendingFiles}>
          {pendingFiles.map((f, i) => (
            <div key={i} className={styles.PendingFile}>
              {f.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(f)}
                  alt={f.name}
                  className={styles.PendingFileThumb}
                />
              ) : (
                <span className={styles.PendingFileIcon}>📎</span>
              )}
              <span className={styles.PendingFileName}>{f.name}</span>
              <button
                className={styles.PendingFileRemove}
                onClick={() =>
                  setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))
                }
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Typing indicator ── */}
      {typingUsers.length > 0 && (
        <div className={styles.TypingIndicator}>
          <span className={styles.TypingAvatars}>
            {typingUsers.slice(0, 5).map((u) => (
              <img
                key={u.userId}
                src={u.avatarUrl ?? '/ouija_white_logo_square.png'}
                alt={u.nickname}
                className={styles.TypingAvatar}
                title={u.nickname}
              />
            ))}
          </span>
          <span className={styles.TypingDots}>
            <span />
            <span />
            <span />
          </span>
          <span className={styles.TypingLabel}>
            {typingUsers.length === 1
              ? typingUsers[0].nickname
              : typingUsers.length <= 3
                ? typingUsers.map((u) => u.nickname).join(', ')
                : `${typingUsers.length} osoby`}{' '}
            pisze…
          </span>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className={styles.ChatMessageToolbar}>
        <form onSubmit={onSendMessage}>
          <label
            htmlFor="file-upload-input"
            className={styles.AttachBtn}
            title={t('chat.attachTitle')}
          >
            📎
          </label>
          <input
            type="text"
            placeholder={t('chat.messagePlaceholder')}
            className={styles.ChatMessageToolbarInput}
            value={messageText}
            onChange={(e) => {
              const val = e.target.value
              setMessageText(val)
              if (onTypingChange) onTypingChange(val.length > 0)
            }}
            disabled={sending}
          />
          <input
            type="submit"
            value={sending ? t('chat.sending') : t('chat.sendBtn')}
            className={styles.ChatMessageToolbarSubmit}
            disabled={sending}
          />
        </form>
      </div>
    </div>
  )
}
