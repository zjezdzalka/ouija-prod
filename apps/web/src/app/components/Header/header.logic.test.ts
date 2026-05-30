import { describe, it, expect } from 'vitest'

// Logika wykrywania ścieżki auth – wydzielona z Header.tsx
function getRouteFlags(pathname: string) {
  const isAuth =
    pathname.startsWith('/login') || pathname.startsWith('/register')
  const isLogin = pathname.startsWith('/login')
  const isRegister = pathname.startsWith('/register')
  return { isAuth, isLogin, isRegister }
}

describe('Header – wykrywanie ścieżek auth', () => {
  it('rozpoznaje /login', () => {
    const { isAuth, isLogin, isRegister } = getRouteFlags('/login')
    expect(isAuth).toBe(true)
    expect(isLogin).toBe(true)
    expect(isRegister).toBe(false)
  })

  it('rozpoznaje /register', () => {
    const { isAuth, isLogin, isRegister } = getRouteFlags('/register')
    expect(isAuth).toBe(true)
    expect(isLogin).toBe(false)
    expect(isRegister).toBe(true)
  })

  it('nie klasyfikuje /chats jako auth', () => {
    const { isAuth, isLogin, isRegister } = getRouteFlags('/chats')
    expect(isAuth).toBe(false)
    expect(isLogin).toBe(false)
    expect(isRegister).toBe(false)
  })

  it('nie klasyfikuje / (home) jako auth', () => {
    const { isAuth } = getRouteFlags('/')
    expect(isAuth).toBe(false)
  })

  it('nie klasyfikuje /profile jako auth', () => {
    const { isAuth } = getRouteFlags('/profile')
    expect(isAuth).toBe(false)
  })

  it('rozpoznaje zagnieżdżone ścieżki: /login/reset', () => {
    // startsWith('/login') powinno złapać też podścieżki
    const { isAuth, isLogin } = getRouteFlags('/login/reset')
    expect(isAuth).toBe(true)
    expect(isLogin).toBe(true)
  })
})
