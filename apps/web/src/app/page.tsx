'use client'

import Image from 'next/image'
import styles from './Home.module.scss'
import { useSettings } from '@/context/SettingsContext'
import { useTranslation } from '@/i18n/translations'

export default function Home() {
  const { settings } = useSettings()
  const { t } = useTranslation()

  // Ciemny motyw → białe logo, jasny motyw → ciemne logo
  const logoSrc =
    settings.theme === 'light'
      ? '/ouija_dark_logo.png'
      : '/ouija_white_logo.png'

  return (
    <>
      <Image
        src={logoSrc}
        alt={'logo'}
        height={0}
        width={0}
        className={styles.containerLogo}
        sizes={'50vw'}
        priority
      />

      <h1 className={styles.containerTitle}>{t('home.title')}</h1>

      <p className={styles.containerText}>{t('home.subtitle')}</p>
    </>
  )
}
