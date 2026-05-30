'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from '../login/Login.module.scss'
import { useTranslation } from '@/i18n/translations'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

function validateEmail(email: string): string | undefined {
  if (!email) return 'forgotPassword.errorEmailRequired'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return 'forgotPassword.errorEmailInvalid'
}

export default function ForgotPassword() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [emailError, setEmailError] = useState<string | undefined>(undefined)
  const [emailTouched, setEmailTouched] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const email = (
      e.currentTarget.elements.namedItem('email') as HTMLInputElement
    ).value.trim()

    const errKey = validateEmail(email)
    setEmailTouched(true)
    setEmailError(errKey)
    if (errKey) return

    setStatus('loading')

    // Always show "done" regardless of whether the email exists (prevents enumeration)
    await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    }).catch(() => {
      /* ignore network errors too */
    })

    setStatus('done')
  }

  if (status === 'done') {
    return (
      <div className={styles.Form}>
        <label className={styles.FormLabel}>
          {t('forgotPassword.doneTitle')}
        </label>
        <p
          style={{
            color: 'var(--text-primary)',
            fontSize: '1.5rem',
            fontWeight: 200,
            margin: '1rem 0'
          }}
        >
          {t('forgotPassword.doneText')}
        </p>
        <Link href={'/login'} className={styles.Link}>
          <p>
            {t('forgotPassword.backTo')}{' '}
            <span className={styles.Underline}>
              {t('forgotPassword.backToLoginLink')}
            </span>
          </p>
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={styles.Form} noValidate>
      <label htmlFor={'email'} className={styles.FormLabel}>
        {t('forgotPassword.title')}
      </label>

      <input
        type={'email'}
        placeholder={t('forgotPassword.email')}
        name="email"
        id="email"
        className={styles.FormInput}
        onBlur={(e) => {
          setEmailTouched(true)
          setEmailError(validateEmail(e.target.value.trim()))
        }}
        aria-invalid={emailTouched && !!emailError}
      />
      {emailTouched && emailError && (
        <p
          style={{ color: '#ff6b6b', fontSize: '1.3rem', margin: '0.3rem 0 0' }}
        >
          {t(emailError as Parameters<typeof t>[0])}
        </p>
      )}

      <input
        type={'submit'}
        value={
          status === 'loading'
            ? t('forgotPassword.submitting')
            : t('forgotPassword.submit')
        }
        disabled={status === 'loading'}
        className={styles.FormSubmit}
      />

      <Link href={'/login'} className={styles.Link}>
        <p>
          {t('forgotPassword.rememberedIt')}{' '}
          <span className={styles.Underline}>
            {t('forgotPassword.backToLogin')}
          </span>
        </p>
      </Link>
    </form>
  )
}
