import { describe, it, expect } from 'vitest'

// Funkcje walidacji skopiowane z register/page.tsx
function validateEmail(email: string): string | undefined {
  if (!email) return 'E-mail jest wymagany'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return 'Nieprawidłowy format e-mail'
}

function validateUsername(username: string): string | undefined {
  if (!username) return 'Nazwa użytkownika jest wymagana'
  if (username.length < 3)
    return 'Nazwa użytkownika musi mieć co najmniej 3 znaki'
  if (username.length > 32)
    return 'Nazwa użytkownika może mieć maksymalnie 32 znaki'
  if (!/^[a-zA-Z0-9_]+$/.test(username))
    return 'Dozwolone znaki: litery, cyfry, podkreślnik'
}

function validatePassword(password: string): string | undefined {
  if (!password) return 'Hasło jest wymagane'
  if (password.length < 8) return 'Hasło musi mieć co najmniej 8 znaków'
  if (!/[A-Z]/.test(password))
    return 'Hasło musi zawierać co najmniej jedną wielką literę'
  if (!/[0-9]/.test(password))
    return 'Hasło musi zawierać co najmniej jedną cyfrę'
}

function validatePasswordConfirm(
  password: string,
  confirm: string
): string | undefined {
  if (!confirm) return 'Powtórzenie hasła jest wymagane'
  if (password !== confirm) return 'Hasła nie są identyczne'
}

// ---------------------------------------------------------------------------
// validateEmail
// ---------------------------------------------------------------------------
describe('Register – validateEmail', () => {
  it('zwraca błąd dla pustego e-maila', () => {
    expect(validateEmail('')).toBe('E-mail jest wymagany')
  })

  it('zwraca błąd dla e-maila bez @', () => {
    expect(validateEmail('jankowalski.com')).toBe('Nieprawidłowy format e-mail')
  })

  it('zwraca błąd dla e-maila bez domeny', () => {
    expect(validateEmail('jan@')).toBe('Nieprawidłowy format e-mail')
  })

  it('zwraca błąd dla e-maila bez TLD', () => {
    expect(validateEmail('jan@domena')).toBe('Nieprawidłowy format e-mail')
  })

  it('nie zwraca błędu dla poprawnego e-maila', () => {
    expect(validateEmail('jan@example.com')).toBeUndefined()
  })

  it('nie zwraca błędu dla e-maila z subdomeną', () => {
    expect(validateEmail('jan@mail.example.pl')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// validateUsername (rejestracja – bardziej restrykcyjna niż login)
// ---------------------------------------------------------------------------
describe('Register – validateUsername', () => {
  it('zwraca błąd dla pustego stringa', () => {
    expect(validateUsername('')).toBe('Nazwa użytkownika jest wymagana')
  })

  it('zwraca błąd gdy username ma mniej niż 3 znaki', () => {
    expect(validateUsername('ab')).toBe(
      'Nazwa użytkownika musi mieć co najmniej 3 znaki'
    )
  })

  it('zwraca błąd gdy username przekracza 32 znaki', () => {
    expect(validateUsername('a'.repeat(33))).toBe(
      'Nazwa użytkownika może mieć maksymalnie 32 znaki'
    )
  })

  it('zwraca błąd gdy username zawiera niedozwolone znaki', () => {
    expect(validateUsername('jan kowalski')).toBe(
      'Dozwolone znaki: litery, cyfry, podkreślnik'
    )
    expect(validateUsername('jan-kowalski')).toBe(
      'Dozwolone znaki: litery, cyfry, podkreślnik'
    )
    expect(validateUsername('jan@kowalski')).toBe(
      'Dozwolone znaki: litery, cyfry, podkreślnik'
    )
  })

  it('nie zwraca błędu dla username z dozwolonymi znakami', () => {
    expect(validateUsername('Jan_123')).toBeUndefined()
    expect(validateUsername('abc')).toBeUndefined()
    expect(validateUsername('a'.repeat(32))).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// validatePassword (rejestracja – wymaga wielkiej litery i cyfry)
// ---------------------------------------------------------------------------
describe('Register – validatePassword', () => {
  it('zwraca błąd dla pustego hasła', () => {
    expect(validatePassword('')).toBe('Hasło jest wymagane')
  })

  it('zwraca błąd dla hasła krótszego niż 8 znaków', () => {
    expect(validatePassword('Ab1')).toBe(
      'Hasło musi mieć co najmniej 8 znaków'
    )
  })

  it('zwraca błąd gdy brak wielkiej litery', () => {
    expect(validatePassword('haslo1234')).toBe(
      'Hasło musi zawierać co najmniej jedną wielką literę'
    )
  })

  it('zwraca błąd gdy brak cyfry', () => {
    expect(validatePassword('HasloTajne')).toBe(
      'Hasło musi zawierać co najmniej jedną cyfrę'
    )
  })

  it('nie zwraca błędu dla spełniającego wszystkie wymagania hasła', () => {
    expect(validatePassword('TajneHaslo1')).toBeUndefined()
    expect(validatePassword('Abc12345')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// validatePasswordConfirm
// ---------------------------------------------------------------------------
describe('Register – validatePasswordConfirm', () => {
  it('zwraca błąd gdy pole potwierdzenia jest puste', () => {
    expect(validatePasswordConfirm('TajneHaslo1', '')).toBe(
      'Powtórzenie hasła jest wymagane'
    )
  })

  it('zwraca błąd gdy hasła się różnią', () => {
    expect(validatePasswordConfirm('TajneHaslo1', 'InneHaslo1')).toBe(
      'Hasła nie są identyczne'
    )
  })

  it('nie zwraca błędu gdy hasła są identyczne', () => {
    expect(validatePasswordConfirm('TajneHaslo1', 'TajneHaslo1')).toBeUndefined()
  })
})
