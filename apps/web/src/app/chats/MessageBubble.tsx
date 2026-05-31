'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import styles from './Chats.module.scss'
import { Message, ReactionType, REACTION_EMOJI } from './types'
import { apiFetch } from '@/utils/auth'
import { API_URL } from './types'

interface Props {
  msg: Message
  isOwn: boolean
  userId: string
  onReact: (messageId: string, type: ReactionType) => void
  onOpenProfile?: (id: string) => void
  searchHighlight?: string
  chatId?: string
  chatUsers?: {
    userId: string
    user: { nickname: string; avatarUrl?: string | null }
  }[]
}

interface PickerPos {
  top: number
  left: number
}
interface TooltipPos {
  top: number
  left: number
}

export default function MessageBubble({
  msg,
  isOwn,
  userId,
  onReact,
  onOpenProfile,
  searchHighlight,
  chatId,
  chatUsers = []
}: Props) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [fileViewer, setFileViewer] = useState<{ url: string; name: string; type: 'pdf' | 'txt' | 'json' | 'csv' | 'md' } | null>(null)
  const [txtContent, setTxtContent] = useState<string | null>(null)
  const [txtLoading, setTxtLoading] = useState(false)
  const [editedContent, setEditedContent] = useState<string | null>(null)
  const editedContentRef = useRef<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [viewerFullscreen, setViewerFullscreen] = useState(false)
  const [lineNumbers, setLineNumbers] = useState(true)
  const [pickerPos, setPickerPos] = useState<PickerPos | null>(null)
  const [hoveredReaction, setHoveredReaction] = useState<ReactionType | null>(
    null
  )
  const [tooltipPos, setTooltipPos] = useState<TooltipPos | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  // Close picker on outside click
  useEffect(() => {
    if (!pickerPos) return
    function handleClick(e: MouseEvent) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      )
        setPickerPos(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [pickerPos])

  // Reposition picker on scroll/resize
  const updatePickerPos = useCallback(() => {
    if (!pickerPos || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setPickerPos({ top: r.top - 8, left: isOwn ? r.right : r.left })
  }, [pickerPos, isOwn])

  useEffect(() => {
    if (!pickerPos) return
    window.addEventListener('scroll', updatePickerPos, true)
    window.addEventListener('resize', updatePickerPos)
    return () => {
      window.removeEventListener('scroll', updatePickerPos, true)
      window.removeEventListener('resize', updatePickerPos)
    }
  }, [pickerPos, updatePickerPos])

  function togglePicker() {
    if (pickerPos) {
      setPickerPos(null)
      return
    }
    if (!btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setPickerPos({ top: r.top - 8, left: isOwn ? r.right : r.left })
  }

  function handleChipMouseEnter(
    type: ReactionType,
    e: React.MouseEvent<HTMLSpanElement>
  ) {
    const r = e.currentTarget.getBoundingClientRect()
    setTooltipPos({ top: r.top, left: r.left + r.width / 2 })
    setHoveredReaction(type)
  }

  function handleChipMouseLeave() {
    setHoveredReaction(null)
    setTooltipPos(null)
  }

  function truncateFilename(name: string, maxBase = 35): string {
    const dotIdx = name.lastIndexOf(".")
    if (dotIdx === -1) return name.length > maxBase ? name.slice(0, maxBase) + "2026" : name
    const base = name.slice(0, dotIdx)
    const ext = name.slice(dotIdx)
    return base.length > maxBase ? base.slice(0, maxBase) + "2026" + ext : name
  }

  function openFileViewer(url: string, name: string) {
    const ext = name.toLowerCase().split('.').pop() ?? ''
    type FVType = 'pdf' | 'txt' | 'json' | 'csv' | 'md'
    const typeMap: Record<string, FVType> = {
      pdf: 'pdf', txt: 'txt', log: 'txt', json: 'json', csv: 'csv', md: 'md'
    }
    const fvType: FVType = typeMap[ext] ?? 'txt'
    if (fvType === 'pdf') {
      setFileViewer({ url, name, type: 'pdf' })
      setTxtContent(null)
      setEditedContent(null)
      setIsEditing(false)
    } else {
      setFileViewer({ url, name, type: fvType })
      setTxtContent(null)
      setEditedContent(null)
      setIsEditing(false)
      setTxtLoading(true)
      apiFetch(url)
        .then((r) => r.text())
        .then((t) => { setTxtContent(t); setEditedContent(t); editedContentRef.current = t })
        .catch(() => { setTxtContent('Nie udało się załadować pliku.'); setEditedContent(null) })
        .finally(() => setTxtLoading(false))
    }
    setViewerFullscreen(false)
  }

  function closeFileViewer() {
    setFileViewer(null)
    setTxtContent(null)
    setEditedContent(null)
    setIsEditing(false)
    setViewerFullscreen(false)
  }

  function handleViewerDownload() {
    if (!fileViewer) return
    const text = isEditing ? (editedContent ?? '') : (txtContent ?? '')
    const blob = new Blob([text], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = fileViewer.name
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const reactions = msg.reactions ?? []

  const reactionGroups = reactions.reduce<
    Partial<Record<ReactionType, { count: number; users: string[] }>>
  >((acc, r) => {
    const nickname =
      r.user?.nickname ??
      chatUsers.find((cu) => cu.userId === r.userId)?.user.nickname ??
      r.userId
    if (!acc[r.type]) acc[r.type] = { count: 0, users: [] }
    acc[r.type]!.count++
    acc[r.type]!.users.push(nickname)
    return acc
  }, {})

  const myReaction = reactions.find((r) => r.userId === userId)?.type

  // Picker rendered into a portal so it escapes every scroll/overflow ancestor
  const pickerPortal =
    pickerPos && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={pickerRef}
            className={styles.ReactionPickerFixed}
            style={{
              top: pickerPos.top,
              left: pickerPos.left,
              transform: isOwn
                ? 'translate(-100%, -100%)'
                : 'translate(0, -100%)'
            }}
          >
            {(Object.keys(REACTION_EMOJI) as ReactionType[]).map((type) => (
              <button
                key={type}
                className={`${styles.ReactionPickerBtn} ${myReaction === type ? styles.ReactionPickerBtnActive : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  onReact(msg.id, type)
                  setPickerPos(null)
                }}
                title={type}
              >
                {REACTION_EMOJI[type]}
              </button>
            ))}
          </div>,
          document.body
        )
      : null

  // Tooltip also in a portal
  const tooltipPortal =
    hoveredReaction && tooltipPos && typeof document !== 'undefined'
      ? createPortal(
          <div
            className={styles.ReactionTooltipFixed}
            style={{ top: tooltipPos.top, left: tooltipPos.left }}
          >
            <span className={styles.ReactionTooltipEmoji}>
              {REACTION_EMOJI[hoveredReaction]}
            </span>
            <span className={styles.ReactionTooltipUsers}>
              {(reactionGroups[hoveredReaction]?.users ?? []).map((name, i) => (
                <span key={i} className={styles.ReactionTooltipUser}>
                  {name}
                </span>
              ))}
            </span>
          </div>,
          document.body
        )
      : null

  /** Wraps matching substrings in a <mark> for search highlight */
  function highlightText(text: string, query: string) {
    if (!query) return <>{text}</>
    const parts = text.split(
      new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    )
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className={styles.SearchHighlight}>
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    )
  }

  const senderEntry = !isOwn
    ? chatUsers.find((cu) => cu.userId === msg.senderId)
    : null

  return (
    <div
      className={`${styles.MessageWrapper} ${isOwn ? styles.MessageWrapperOwn : ''}`}
    >
      {senderEntry && (
        <span
          className={styles.MessageSender}
          onClick={() => onOpenProfile?.(msg.senderId)}
          style={onOpenProfile ? { cursor: 'pointer' } : undefined}
        >
          {senderEntry.user.nickname}
        </span>
      )}
      <div
        className={`${styles.MessageBubble} ${isOwn ? styles.MessageBubbleOwn : styles.MessageBubbleOther}`}
      >
        {msg.content && (
          <p className={styles.MessageText}>
            {searchHighlight
              ? highlightText(msg.content, searchHighlight)
              : msg.content}
          </p>
        )}

        {(msg.attachments ?? []).map((att) => (
          <div key={att.id} className={styles.MessageAttachment}>
            {att.type === 'IMAGE' ? (
              <img
                src={att.url}
                alt="załącznik"
                className={styles.MessageAttachmentImage}
                onClick={() => setLightboxUrl(att.url)}
                title="Kliknij, aby powiększyć"
              />
            ) : att.type === 'VIDEO' ? (
              <video
                src={att.url}
                controls
                className={styles.MessageAttachmentVideo}
              />
            ) : (
              <div className={styles.MessageAttachmentFileRow}>
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.MessageAttachmentFile}
                >
                  📎 {att.name ? truncateFilename(att.name) : 'Plik'}
                </a>
                {att.name && (() => {
                  const ext = att.name.toLowerCase().split('.').pop() ?? ''
                  const viewable = ['pdf', 'txt', 'log', 'json', 'csv', 'md'].includes(ext)
                  return viewable ? (
                    <button
                      className={styles.MessageAttachmentViewBtn}
                      onClick={() => openFileViewer(att.url, att.name!)}
                      title="Otwórz podgląd"
                    >👁</button>
                  ) : null
                })()}
              </div>
            )}
          </div>
        ))}

        <span className={styles.MessageTime}>
          {new Date(msg.sentAt).toLocaleTimeString('pl-PL', {
            hour: '2-digit',
            minute: '2-digit'
          })}
          {msg.editedAt && ' (edytowano)'}
        </span>

        <button
          ref={btnRef}
          className={styles.MessageReactBtn}
          onClick={togglePicker}
          title="Dodaj reakcję"
        >
          {myReaction ? REACTION_EMOJI[myReaction] : '＋'}
        </button>
      </div>

      {Object.keys(reactionGroups).length > 0 && (
        <div
          className={`${styles.ReactionBar} ${isOwn ? styles.ReactionBarOwn : ''}`}
        >
          {(
            Object.entries(reactionGroups) as [
              ReactionType,
              { count: number; users: string[] }
            ][]
          ).map(([type, { count }]) => {
            const emoji = REACTION_EMOJI[type]
            if (!emoji) return null
            return (
              <span
                key={type}
                className={`${styles.ReactionChip} ${myReaction === type ? styles.ReactionChipActive : ''}`}
                onClick={() => onReact(msg.id, type)}
                onMouseEnter={(e) => handleChipMouseEnter(type, e)}
                onMouseLeave={handleChipMouseLeave}
              >
                {emoji} {count}
              </span>
            )
          })}
        </div>
      )}

      {pickerPortal}
      {tooltipPortal}

      {/* ── Image lightbox ── */}
      {lightboxUrl && createPortal(
        <div
          className={styles.LightboxOverlay}
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className={styles.LightboxClose}
            onClick={() => setLightboxUrl(null)}
            aria-label="Zamknij"
          >✕</button>
          <img
            src={lightboxUrl}
            alt="Podgląd"
            className={styles.LightboxImg}
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}

      {/* ── PDF / Text file viewer ── */}
      {fileViewer && createPortal(
        <div
          className={`${styles.FileViewerOverlay}${viewerFullscreen ? ` ${styles.FileViewerOverlayFullscreen}` : ''}`}
          onClick={closeFileViewer}
        >
          <div
            className={`${styles.FileViewerPanel}${viewerFullscreen ? ` ${styles.FileViewerPanelFullscreen}` : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div className={styles.FileViewerHeader}>
              <div className={styles.FileViewerTitleRow}>
                <span className={styles.FileViewerTypeTag}>
                  {fileViewer.type.toUpperCase()}
                </span>
                <span className={styles.FileViewerTitle} title={fileViewer.name}>
                  {fileViewer.name}
                </span>
              </div>
              <div className={styles.FileViewerHeaderActions}>
                {fileViewer.type !== 'pdf' && !txtLoading && txtContent !== null && (
                  <>
                    {isEditing && (
                      <button
                        className={`${styles.FileViewerToolBtn} ${styles.FileViewerToolBtnActive}`}
                        onClick={() => setLineNumbers((v) => !v)}
                        title="Numery linii"
                      >#</button>
                    )}
                    <button
                      className={`${styles.FileViewerToolBtn}${isEditing ? ` ${styles.FileViewerToolBtnActive}` : ''}`}
                      onClick={() => setIsEditing((v) => !v)}
                      title={isEditing ? 'Tryb podglądu' : 'Edytuj'}
                    >{isEditing ? '👁 Podgląd' : '✏ Edytuj'}</button>
                  </>
                )}
                <button
                  className={styles.FileViewerToolBtn}
                  onClick={() => setViewerFullscreen((v) => !v)}
                  title={viewerFullscreen ? 'Zmniejsz' : 'Pełny ekran'}
                >{viewerFullscreen ? '⤡' : '⤢'}</button>
                {fileViewer.type === 'pdf' ? (
                  <a
                    href={fileViewer.url}
                    download={fileViewer.name}
                    className={styles.FileViewerToolBtn}
                    title="Pobierz"
                  >⬇</a>
                ) : (
                  <button
                    className={styles.FileViewerToolBtn}
                    onClick={handleViewerDownload}
                    title="Pobierz"
                  >⬇</button>
                )}
                <button
                  className={`${styles.FileViewerToolBtn} ${styles.FileViewerCloseBtn}`}
                  onClick={closeFileViewer}
                  aria-label="Zamknij"
                >✕</button>
              </div>
            </div>

            {/* ── Body ── */}
            <div className={styles.FileViewerBody}>
              {fileViewer.type === 'pdf' ? (
                <iframe
                  src={fileViewer.url}
                  className={styles.FileViewerIframe}
                  title={fileViewer.name}
                />
              ) : txtLoading ? (
                <div className={styles.FileViewerLoading}>
                  <span className={styles.FileViewerSpinner} />
                  Ładowanie…
                </div>
              ) : isEditing ? (
                <div className={styles.FileViewerEditorWrap}>
                  {lineNumbers && (
                    <div className={styles.FileViewerLineNums} aria-hidden>
                      {(editedContent ?? '').split('\n').map((_, i) => (
                        <span key={i}>{i + 1}</span>
                      ))}
                    </div>
                  )}
                  <textarea
                    className={styles.FileViewerTextarea}
                    value={editedContent ?? ''}
                    onChange={(e) => { setEditedContent(e.target.value); editedContentRef.current = e.target.value }}
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                  />
                </div>
              ) : (
                <div className={styles.FileViewerEditorWrap}>
                  {lineNumbers && (
                    <div className={styles.FileViewerLineNums} aria-hidden>
                      {(txtContent ?? '').split('\n').map((_, i) => (
                        <span key={i}>{i + 1}</span>
                      ))}
                    </div>
                  )}
                  <pre className={styles.FileViewerPre}>{txtContent}</pre>
                </div>
              )}
            </div>

            {saveError && (
              <div className={styles.FileViewerSaveError}>{saveError}</div>
            )}
            {/* ── Footer (edit mode) ── */}
            {isEditing && (
              <div className={styles.FileViewerFooter}>
                <span className={styles.FileViewerFooterInfo}>
                  {(editedContent ?? '').split('\n').length} linii · {(editedContent ?? '').length} znaków
                </span>
                <div className={styles.FileViewerFooterActions}>
                  <button
                    className={styles.FileViewerToolBtn}
                    onClick={() => { setEditedContent(txtContent); editedContentRef.current = txtContent; setIsEditing(false) }}
                  >Anuluj</button>
                  <button
                    className={`${styles.FileViewerToolBtn} ${styles.FileViewerToolBtnSave}`}
                    onClick={async () => {
                      if (!chatId || !fileViewer) return
                      const saved = editedContentRef.current ?? ''
                      setIsSaving(true)
                      setSaveError(null)
                      try {
                        // Upload edited content as a new file
                        const blob = new Blob([saved], { type: 'text/plain' })
                        const file = new File([blob], fileViewer.name, { type: 'text/plain' })
                        const form = new FormData()
                        form.append('ownerId', userId)
                        form.append('files', file)
                        const uploadRes = await apiFetch(`${API_URL}/api/media/upload`, { method: 'POST', body: form })
                        if (!uploadRes.ok) {
                          setSaveError('Nie udało się zapisać pliku.')
                          return
                        }
                        const [media] = await uploadRes.json()
                        // Send as new message with attachment
                        const msgRes = await apiFetch(`${API_URL}/api/chats/${chatId}/messages`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            userId,
                            content: null,
                            attachments: [{ url: media.url, name: fileViewer.name, type: 'FILE' }]
                          })
                        })
                        if (!msgRes.ok) {
                          setSaveError('Nie udało się zapisać pliku.')
                          return
                        }
                        // Update local preview and close editor
                        setTxtContent(saved)
                        setEditedContent(saved)
                        setIsEditing(false)
                      } catch {
                        setSaveError('Nie udało się zapisać pliku.')
                      } finally {
                        setIsSaving(false)
                      }
                    }}
                  disabled={isSaving}>{isSaving ? '⏳ Wysyłanie…' : '✓ Zapisz i wyślij'}</button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
