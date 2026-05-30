'use client'

import styles from './Login.module.scss'
import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/i18n/translations'
import { saveSession } from '@utils/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface FormErrors {
  username?: string
  password?: string
  submit?: string
}

export default function Login() {
  const router = useRouter()
  const { t } = useTranslation()
  const [passwordResetEnabled, setPasswordResetEnabled] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)

  function validateUsername(username: string): string | undefined {
    if (!username) return t('login.errorUsernameRequired')
    if (username.length < 3) return t('login.errorUsernameShort')
  }

  function validatePassword(password: string): string | undefined {
    if (!password) return t('login.errorPasswordRequired')
    if (password.length < 8) return t('login.errorPasswordShort')
  }

  useEffect(() => {
    fetch(`${API_URL}/api/auth/config`)
      .then((r) => r.json())
      .then((cfg) => setPasswordResetEnabled(cfg.enablePasswordReset ?? false))
      .catch(() => {})
  }, [])

  function handleBlur(field: string, value: string) {
    setTouched((prev) => ({ ...prev, [field]: true }))
    let error: string | undefined

    if (field === 'username') error = validateUsername(value)
    if (field === 'password') error = validatePassword(value)

    setErrors((prev) => ({ ...prev, [field]: error }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget

    const username = (
      form.elements.namedItem('username') as HTMLInputElement
    ).value.trim()
    const password = (form.elements.namedItem('password') as HTMLInputElement)
      .value

    const newErrors: FormErrors = {
      username: validateUsername(username),
      password: validatePassword(password)
    }

    setTouched({ username: true, password: true })
    setErrors(newErrors)

    if (Object.values(newErrors).some(Boolean)) return

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: username, password })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        if (err.error === 'email not verified') {
          setErrors((prev) => ({ ...prev, submit: t('login.errorEmailNotVerified' as never) ?? 'Potwierdź adres e-mail przed zalogowaniem.' }))
        } else {
          setErrors((prev) => ({ ...prev, submit: t('login.errorInvalid') }))
        }
        return
      }

      const { token, user } = await res.json()
      saveSession(token, user.id, user.nickname)
      router.push('/chats')
    } catch {
      setErrors((prev) => ({ ...prev, submit: t('login.errorServer') }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className={styles.Form} noValidate>
        <label htmlFor="username" className={styles.FormLabel}>
          {t('login.username')}
        </label>
        <input
          type="text"
          placeholder={t('login.username')}
          name="username"
          id="username"
          className={styles.FormInput}
          onBlur={(e) => handleBlur('username', e.target.value)}
          aria-invalid={touched.username && !!errors.username}
        />
        {touched.username && errors.username && (
          <p className={styles.FormError}>{errors.username}</p>
        )}

        <label htmlFor="password" className={styles.FormLabel}>
          {t('login.password')}
        </label>
        <input
          type="password"
          placeholder={t('login.password')}
          name="password"
          id="password"
          className={styles.FormInput}
          onBlur={(e) => handleBlur('password', e.target.value)}
          aria-invalid={touched.password && !!errors.password}
        />
        {touched.password && errors.password && (
          <p className={styles.FormError}>{errors.password}</p>
        )}

        {errors.submit && <p className={styles.FormError}>{errors.submit}</p>}

        <input
          type="submit"
          value={loading ? t('login.submitting') : t('login.submit')}
          disabled={loading}
          className={styles.FormSubmit}
        />

        <Link href={'/register'} className={styles.Link}>
          <p>
            {t('login.noAccount')}{' '}
            <span className={styles.Underline}>{t('login.register')}</span>
          </p>
        </Link>

        {passwordResetEnabled && (
          <Link href={'/forgot-password'} className={styles.Link}>
            <p>
              <span className={styles.Underline}>
                {t('login.forgotPassword')}
              </span>
            </p>
          </Link>
        )}
      </form>
    </>
  )
}
