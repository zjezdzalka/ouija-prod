import { describe, it, expect } from 'vitest'

// Kopiujemy funkcje walidacji z login/page.tsx, żeby móc testować je w izolacji.
// Idealnie byłoby je wyeksportować z osobnego pliku utils/validation.ts.
function validateUsername(username: string): string | undefined {
  if (!username) return 'Nazwa użytkownika jest wymagana'
  if (username.length < 3)
    return 'Nazwa użytkownika musi mieć co najmniej 3 znaki'
}

function validatePassword(password: string): string | undefined {
  if (!password) return 'Hasło jest wymagane'
  if (password.length < 8) return 'Hasło musi mieć co najmniej 8 znaków'
}

describe('Login – validateUsername', () => {
  it('zwraca błąd dla pustego stringa', () => {
    expect(validateUsername('')).toBe('Nazwa użytkownika jest wymagana')
  })

  it('zwraca błąd gdy username ma mniej niż 3 znaki', () => {
    expect(validateUsername('ab')).toBe(
      'Nazwa użytkownika musi mieć co najmniej 3 znaki'
    )
  })

  it('zwraca błąd dla username o dokładnie 2 znakach', () => {
    expect(validateUsername('xy')).toBeDefined()
  })

  it('nie zwraca błędu dla username o dokładnie 3 znakach', () => {
    expect(validateUsername('abc')).toBeUndefined()
  })

  it('nie zwraca błędu dla poprawnego username', () => {
    expect(validateUsername('jan_kowalski')).toBeUndefined()
  })
})

describe('Login – validatePassword', () => {
  it('zwraca błąd dla pustego hasła', () => {
    expect(validatePassword('')).toBe('Hasło jest wymagane')
  })

  it('zwraca błąd gdy hasło ma mniej niż 8 znaków', () => {
    expect(validatePassword('abc123')).toBe(
      'Hasło musi mieć co najmniej 8 znaków'
    )
  })

  it('zwraca błąd dla hasła o dokładnie 7 znakach', () => {
    expect(validatePassword('Abc1234')).toBeDefined()
  })

  it('nie zwraca błędu dla hasła o dokładnie 8 znakach', () => {
    expect(validatePassword('abcdefgh')).toBeUndefined()
  })

  it('nie zwraca błędu dla długiego hasła', () => {
    expect(validatePassword('superTajneHaslo123!')).toBeUndefined()
  })
})
