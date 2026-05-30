import { describe, it, expect } from 'vitest'

// ---------------------------------------------------------------------------
// Typy i helpery skopiowane z chats/page.tsx
// ---------------------------------------------------------------------------
type ReactionType =
  | 'LIKE'
  | 'LOVE'
  | 'LAUGH'
  | 'SAD'
  | 'ANGRY'
  | 'THUMBS_UP'
  | 'THUMBS_DOWN'
type UserStatus = 'ONLINE' | 'OFFLINE' | 'AWAY' | 'BUSY'

interface Reaction {
  messageId: string
  userId: string
  type: ReactionType
}
interface ChatUserEntry {
  userId: string
  chatId: string
  role: string
  joinedAt: string
  user: {
    id: string
    nickname: string
    status: UserStatus
    avatarUrl?: string | null
  }
}
interface Chat {
  id: string
  name: string | null
  type: string
  createdAt: string
  updatedAt: string
  users: ChatUserEntry[]
}

const REACTION_EMOJI: Record<ReactionType, string> = {
  LIKE: '👍',
  LOVE: '❤️',
  LAUGH: '😂',
  SAD: '😢',
  ANGRY: '😡',
  THUMBS_UP: '👆',
  THUMBS_DOWN: '👇'
}

function getChatDisplayName(chat: Chat, userId: string): string {
  if (chat.name) return chat.name
  return chat.users.find((u) => u.userId !== userId)?.user.nickname ?? 'Czat'
}

function getOtherUser(chat: Chat, userId: string) {
  return chat.users.find((u) => u.userId !== userId)?.user ?? null
}

function avatarSrc(url?: string | null): string {
  return url ?? '/ouija_white_logo_square.png'
}

// Logika liczenia reakcji (wydzielona z MessageBubble)
function countReactions(
  reactions: Reaction[]
): Partial<Record<ReactionType, number>> {
  return reactions.reduce<Partial<Record<ReactionType, number>>>(
    (acc, r) => ({ ...acc, [r.type]: (acc[r.type] ?? 0) + 1 }),
    {}
  )
}

// ---------------------------------------------------------------------------
// getChatDisplayName
// ---------------------------------------------------------------------------
describe('getChatDisplayName', () => {
  const myId = 'user-1'

  it('zwraca nazwę czatu grupowego jeśli jest ustawiona', () => {
    const chat: Chat = {
      id: 'c1',
      name: 'Projekt Ouija',
      type: 'GROUP',
      createdAt: '',
      updatedAt: '',
      users: [
        {
          userId: myId,
          chatId: 'c1',
          role: 'ADMIN',
          joinedAt: '',
          user: { id: myId, nickname: 'Ja', status: 'ONLINE' }
        },
        {
          userId: 'user-2',
          chatId: 'c1',
          role: 'MEMBER',
          joinedAt: '',
          user: { id: 'user-2', nickname: 'Ania', status: 'AWAY' }
        }
      ]
    }
    expect(getChatDisplayName(chat, myId)).toBe('Projekt Ouija')
  })

  it('zwraca nickname rozmówcy dla czatu prywatnego (bez nazwy)', () => {
    const chat: Chat = {
      id: 'c2',
      name: null,
      type: 'PRIVATE',
      createdAt: '',
      updatedAt: '',
      users: [
        {
          userId: myId,
          chatId: 'c2',
          role: 'MEMBER',
          joinedAt: '',
          user: { id: myId, nickname: 'Ja', status: 'ONLINE' }
        },
        {
          userId: 'user-3',
          chatId: 'c2',
          role: 'MEMBER',
          joinedAt: '',
          user: { id: 'user-3', nickname: 'Piotrek', status: 'BUSY' }
        }
      ]
    }
    expect(getChatDisplayName(chat, myId)).toBe('Piotrek')
  })

  it('zwraca "Czat" gdy brak rozmówcy i brak nazwy', () => {
    const chat: Chat = {
      id: 'c3',
      name: null,
      type: 'PRIVATE',
      createdAt: '',
      updatedAt: '',
      users: [
        {
          userId: myId,
          chatId: 'c3',
          role: 'MEMBER',
          joinedAt: '',
          user: { id: myId, nickname: 'Ja', status: 'ONLINE' }
        }
      ]
    }
    expect(getChatDisplayName(chat, myId)).toBe('Czat')
  })
})

// ---------------------------------------------------------------------------
// getOtherUser
// ---------------------------------------------------------------------------
describe('getOtherUser', () => {
  const myId = 'user-1'

  it('zwraca dane drugiego użytkownika w czacie prywatnym', () => {
    const chat: Chat = {
      id: 'c1',
      name: null,
      type: 'PRIVATE',
      createdAt: '',
      updatedAt: '',
      users: [
        {
          userId: myId,
          chatId: 'c1',
          role: 'MEMBER',
          joinedAt: '',
          user: { id: myId, nickname: 'Ja', status: 'ONLINE' }
        },
        {
          userId: 'user-2',
          chatId: 'c1',
          role: 'MEMBER',
          joinedAt: '',
          user: { id: 'user-2', nickname: 'Ania', status: 'AWAY' }
        }
      ]
    }
    const other = getOtherUser(chat, myId)
    expect(other).not.toBeNull()
    expect(other?.nickname).toBe('Ania')
  })

  it('zwraca null gdy jesteśmy jedynym użytkownikiem czatu', () => {
    const chat: Chat = {
      id: 'c2',
      name: null,
      type: 'PRIVATE',
      createdAt: '',
      updatedAt: '',
      users: [
        {
          userId: myId,
          chatId: 'c2',
          role: 'ADMIN',
          joinedAt: '',
          user: { id: myId, nickname: 'Ja', status: 'ONLINE' }
        }
      ]
    }
    expect(getOtherUser(chat, myId)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// avatarSrc
// ---------------------------------------------------------------------------
describe('avatarSrc', () => {
  it('zwraca podany URL gdy nie jest null/undefined', () => {
    expect(avatarSrc('https://cdn.example.com/avatar.jpg')).toBe(
      'https://cdn.example.com/avatar.jpg'
    )
  })

  it('zwraca domyślny avatar dla null', () => {
    expect(avatarSrc(null)).toBe('/ouija_white_logo_square.png')
  })

  it('zwraca domyślny avatar gdy argument pominięty', () => {
    expect(avatarSrc()).toBe('/ouija_white_logo_square.png')
  })
})

// ---------------------------------------------------------------------------
// countReactions
// ---------------------------------------------------------------------------
describe('countReactions', () => {
  it('zwraca pusty obiekt dla braku reakcji', () => {
    expect(countReactions([])).toEqual({})
  })

  it('liczy pojedynczą reakcję', () => {
    const reactions: Reaction[] = [
      { messageId: 'm1', userId: 'u1', type: 'LIKE' }
    ]
    expect(countReactions(reactions)).toEqual({ LIKE: 1 })
  })

  it('grupuje reakcje tego samego typu', () => {
    const reactions: Reaction[] = [
      { messageId: 'm1', userId: 'u1', type: 'LOVE' },
      { messageId: 'm1', userId: 'u2', type: 'LOVE' },
      { messageId: 'm1', userId: 'u3', type: 'LIKE' }
    ]
    const result = countReactions(reactions)
    expect(result.LOVE).toBe(2)
    expect(result.LIKE).toBe(1)
  })

  it('obsługuje wszystkie typy reakcji', () => {
    const types: ReactionType[] = [
      'LIKE',
      'LOVE',
      'LAUGH',
      'SAD',
      'ANGRY',
      'THUMBS_UP',
      'THUMBS_DOWN'
    ]
    const reactions: Reaction[] = types.map((type) => ({
      messageId: 'm1',
      userId: `u-${type}`,
      type
    }))
    const result = countReactions(reactions)
    types.forEach((type) => {
      expect(result[type]).toBe(1)
    })
  })
})

// ---------------------------------------------------------------------------
// REACTION_EMOJI – sprawdzenie kompletności mapowania
// ---------------------------------------------------------------------------
describe('REACTION_EMOJI', () => {
  const expectedTypes: ReactionType[] = [
    'LIKE',
    'LOVE',
    'LAUGH',
    'SAD',
    'ANGRY',
    'THUMBS_UP',
    'THUMBS_DOWN'
  ]

  it('zawiera emoji dla każdego typu reakcji', () => {
    expectedTypes.forEach((type) => {
      expect(REACTION_EMOJI[type]).toBeDefined()
      expect(typeof REACTION_EMOJI[type]).toBe('string')
    })
  })
})
