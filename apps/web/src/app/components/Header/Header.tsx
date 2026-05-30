'use client'

import Image from 'next/image'
import styles from './Header.module.scss'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSettings } from '@/context/SettingsContext'
import { useTranslation } from '@/i18n/translations'

export default function Header() {
  const pathname = usePathname()
  const [loggedIn, setLoggedIn] = useState(false)
  const [nickname, setNickname] = useState<string | null>(null)
  const { settings } = useSettings()
  const { t } = useTranslation()

  const isAuth =
    pathname.startsWith('/login') || pathname.startsWith('/register')
  const isLogin = pathname.startsWith('/login')
  const isRegister = pathname.startsWith('/register')

  // Wybór logo zależny od motywu:
  // ciemny motyw → biały/jasny obrazek (ouija_white.png)
  // jasny motyw  → ciemny obrazek     (ouija_dark.png)
  const logoSrc =
    settings.theme === 'light' ? '/ouija_dark.png' : '/ouija_white.png'

  useEffect(() => {
    const userId = localStorage.getItem('userId')
    const userNickname = localStorage.getItem('userNickname')
    setLoggedIn(!!userId)
    setNickname(userNickname)
  }, [pathname])

  return (
    <header className={styles.Header}>
      <Link href="/">
        <Image
          src={logoSrc}
          alt={'logo'}
          width={1275}
          height={690}
          className={styles.HeaderLogo}
          style={{ width: 'auto', height: 'clamp(3.2rem, 5vh, 5.6rem)' }}
          priority
        />
      </Link>

      {/* Strony auth — login/register */}
      {isAuth && (
        <div className={styles.HeaderRight}>
          <p
            className={
              isLogin
                ? styles.HeaderText
                : [styles.HeaderText, styles.Invisible].join(' ')
            }
          >
            {t('nav.login')}
          </p>
          <p
            className={
              isRegister
                ? styles.HeaderText
                : [styles.HeaderText, styles.Invisible].join(' ')
            }
          >
            {t('nav.register')}
          </p>
        </div>
      )}

      {/* Niezalogowany, nie na stronie auth */}
      {!isAuth && !loggedIn && (
        <div className={styles.HeaderRight}>
          <Link href="/login" className={styles.HeaderLink}>
            {t('nav.login')}
          </Link>
          <Link href="/register" className={styles.HeaderLink}>
            {t('nav.register')}
          </Link>
        </div>
      )}

      {/* Zalogowany */}
      {!isAuth && loggedIn && (
        <div className={styles.HeaderRight}>
          <Link href="/chats" className={styles.HeaderLink}>
            {t('nav.chats')}
          </Link>
          <Link href="/profile" className={styles.HeaderLink}>
            {nickname ?? 'profile'}
          </Link>
        </div>
      )}
    </header>
  )
}
