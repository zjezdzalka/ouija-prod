'use client'

import styles from './Register.module.scss'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useTranslation } from '@/i18n/translations'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface FormErrors {
  email?: string
  username?: string
  password?: string
  passwordConfirm?: string
  submit?: string
}

export default function Register() {
  const { t } = useTranslation()
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [requiresVerification, setRequiresVerification] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>(
    'idle'
  )
  const [error, setError] = useState('')

  function validateEmail(email: string): string | undefined {
    if (!email) return t('register.errorEmailRequired')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return t('register.errorEmailInvalid')
  }

  function validateUsername(username: string): string | undefined {
    if (!username) return t('register.errorUsernameRequired')
    if (username.length < 3) return t('register.errorUsernameShort')
    if (username.length > 32) return t('register.errorUsernameLong')
    if (!/^[a-zA-Z0-9_]+$/.test(username))
      return t('register.errorUsernameChars')
  }

  function validatePassword(password: string): string | undefined {
    if (!password) return t('register.errorPasswordRequired')
    if (password.length < 8) return t('register.errorPasswordShort')
    if (!/[A-Z]/.test(password)) return t('register.errorPasswordUppercase')
    if (!/[0-9]/.test(password)) return t('register.errorPasswordDigit')
  }

  function validatePasswordConfirm(
    password: string,
    confirm: string
  ): string | undefined {
    if (!confirm) return t('register.errorPasswordConfirmRequired')
    if (password !== confirm) return t('register.errorPasswordConfirmMatch')
  }

  useEffect(() => {
    fetch(`${API_URL}/api/auth/config`)
      .then((r) => r.json())
      .then((cfg) =>
        setRequiresVerification(cfg.requireEmailVerification ?? false)
      )
      .catch(() => {})
  }, [])

  function handleBlur(field: string, value: string, extraValue?: string) {
    setTouched((prev) => ({ ...prev, [field]: true }))
    let err: string | undefined

    if (field === 'email') err = validateEmail(value)
    if (field === 'username') err = validateUsername(value)
    if (field === 'password') err = validatePassword(value)
    if (field === 'passwordConfirm')
      err = validatePasswordConfirm(extraValue ?? '', value)

    setErrors((prev) => ({ ...prev, [field]: err }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus('loading')
    setError('')

    const form = e.currentTarget
    const email = (
      form.elements.namedItem('email') as HTMLInputElement
    ).value.trim()
    const nickname = (
      form.elements.namedItem('username') as HTMLInputElement
    ).value.trim()
    const password = (
      form.elements.namedItem('password') as HTMLInputElement
    ).value.trim()
    const confirm = (
      form.elements.namedItem('password-confirm') as HTMLInputElement
    ).value.trim()

    const newErrors: FormErrors = {
      email: validateEmail(email),
      username: validateUsername(nickname),
      password: validatePassword(password),
      passwordConfirm: validatePasswordConfirm(password, confirm)
    }

    setTouched({
      email: true,
      username: true,
      password: true,
      passwordConfirm: true
    })
    setErrors(newErrors)

    if (Object.values(newErrors).some(Boolean)) {
      setStatus('idle')
      return
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, nickname })
      })

      const data = await res.json()

      if (!res.ok) {
        const msg: string = data?.error ?? 'Błąd rejestracji'
        if (
          msg.includes('email already exists') ||
          msg.includes('email już istnieje')
        ) {
          setErrors((prev) => ({
            ...prev,
            email: t('register.errorEmailExists')
          }))
        } else if (
          msg.includes('already exists') ||
          msg.includes('już istnieje')
        ) {
          setErrors((prev) => ({
            ...prev,
            username: t('register.errorUsernameExists')
          }))
        } else {
          setError(msg)
        }
        setStatus('error')
        return
      }

      setRequiresVerification(data.requiresVerification ?? false)
      setStatus('done')
    } catch {
      setErrors((prev) => ({ ...prev, submit: t('register.errorServer') }))
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className={styles.Form} style={{ alignItems: 'center', gap: '0.8rem' }}>
        <div style={{ fontSize: '4rem', lineHeight: 1 }}>
          {requiresVerification ? '📬' : '🎉'}
        </div>
        <h2
          style={{
            fontSize: '2.4rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: '0.4rem 0 0',
            letterSpacing: '-0.02em'
          }}
        >
          {requiresVerification
            ? t('register.successVerifyTitle')
            : t('register.successTitle')}
        </h2>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '1.5rem',
            fontWeight: 400,
            margin: '0.4rem 0 1.2rem',
            textAlign: 'center',
            lineHeight: 1.5
          }}
        >
          {requiresVerification
            ? t('register.successVerify')
            : t('register.successReady')}
        </p>
        <Link href={'/login'} className={styles.Link}>
          <p>
            {t('register.goToLogin')}{' '}
            <span className={styles.Underline}>
              {t('register.goToLoginLink')}
            </span>
          </p>
        </Link>
      </div>
    )
  }

  return (
    <>
      <form onSubmit={handleSubmit} className={styles.Form} noValidate>
        <label htmlFor="email" className={styles.FormLabel}>
          {t('register.email')}
        </label>
        <input
          type="email"
          placeholder={t('register.email')}
          name="email"
          id="email"
          className={styles.FormInput}
          onBlur={(e) => handleBlur('email', e.target.value)}
          aria-invalid={touched.email && !!errors.email}
        />
        {touched.email && errors.email && (
          <p className={styles.FormError}>{errors.email}</p>
        )}

        <label htmlFor={'username'} className={styles.FormLabel}>
          {t('register.username')}
        </label>
        <input
          type="text"
          placeholder={t('register.username')}
          name="username"
          id="username"
          className={styles.FormInput}
          maxLength={32}
          onBlur={(e) => handleBlur('username', e.target.value)}
          aria-invalid={touched.username && !!errors.username}
        />
        {touched.username && errors.username && (
          <p className={styles.FormError}>{errors.username}</p>
        )}

        <label htmlFor="password" className={styles.FormLabel}>
          {t('register.password')}
        </label>
        <input
          type="password"
          placeholder={t('register.password')}
          name="password"
          id="password"
          className={styles.FormInput}
          onBlur={(e) => handleBlur('password', e.target.value)}
          aria-invalid={touched.password && !!errors.password}
        />
        {touched.password && errors.password && (
          <p className={styles.FormError}>{errors.password}</p>
        )}

        <label htmlFor="password-confirm" className={styles.FormLabel}>
          {t('register.passwordConfirm')}
        </label>
        <input
          type="password"
          placeholder={t('register.passwordConfirm')}
          name="password-confirm"
          id="password-confirm"
          className={styles.FormInput}
          onBlur={(e) => {
            const password = (
              e.target.form?.elements.namedItem('password') as HTMLInputElement
            )?.value
            handleBlur('passwordConfirm', e.target.value, password)
          }}
          aria-invalid={touched.passwordConfirm && !!errors.passwordConfirm}
        />
        {touched.passwordConfirm && errors.passwordConfirm && (
          <p className={styles.FormError}>{errors.passwordConfirm}</p>
        )}

        {status === 'error' && error && (
          <p
            style={{ color: '#ff6b6b', fontSize: '1.4rem', margin: '0.5rem 0' }}
          >
            {error}
          </p>
        )}
        {errors.submit && <p className={styles.FormError}>{errors.submit}</p>}

        <input
          type={'submit'}
          value={
            status === 'loading'
              ? t('register.submitting')
              : t('register.submit')
          }
          disabled={status === 'loading'}
          className={styles.FormSubmit}
        />

        <Link href={'/login'} className={styles.Link}>
          <p>
            {t('register.hasAccount')}{' '}
            <span className={styles.Underline}>{t('register.login')}</span>
          </p>
        </Link>
      </form>
    </>
  )
}
