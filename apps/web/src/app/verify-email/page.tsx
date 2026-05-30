'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import styles from '../login/Login.module.scss'
import { useTranslation } from '@/i18n/translations'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

function VerifyEmailContent() {
  const params = useSearchParams()
  const token = params.get('token')
  const { t } = useTranslation()
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage(t('verifyEmail.messageNoToken'))
      return
    }

    fetch(`${API_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Verification failed.')
        setStatus('done')
        setMessage(t('verifyEmail.messageDone'))
      })
      .catch((err) => {
        setStatus('error')
        setMessage((err as Error).message)
      })
  }, [token])

  const titleKey =
    status === 'loading'
      ? 'verifyEmail.titleLoading'
      : status === 'done'
        ? 'verifyEmail.titleDone'
        : 'verifyEmail.titleError'

  return (
    <div className={styles.Form} style={{ alignItems: 'center', gap: '0.8rem' }}>
      {status !== 'loading' && (
        <div style={{ fontSize: '4rem', lineHeight: 1 }}>
          {status === 'done' ? '✅' : '❌'}
        </div>
      )}
      {status === 'loading' && (
        <div style={{ fontSize: '4rem', lineHeight: 1 }}>⏳</div>
      )}
      <h2
        style={{
          fontSize: '2.4rem',
          fontWeight: 700,
          color: status === 'error' ? '#f87171' : 'var(--text-primary)',
          margin: '0.4rem 0 0',
          letterSpacing: '-0.02em'
        }}
      >
        {t(titleKey)}
      </h2>

      <p
        style={{
          color: status === 'error' ? '#f87171' : 'var(--text-secondary)',
          fontSize: '1.5rem',
          fontWeight: 400,
          margin: '0.4rem 0 1.2rem',
          textAlign: 'center',
          lineHeight: 1.5
        }}
      >
        {message}
      </p>

      {status !== 'loading' && (
        <Link href={'/login'} className={styles.Link}>
          <p>
            {t('verifyEmail.goTo')}{' '}
            <span className={styles.Underline}>
              {t('verifyEmail.goToLoginLink')}
            </span>
          </p>
        </Link>
      )}
    </div>
  )
}

export default function VerifyEmail() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
