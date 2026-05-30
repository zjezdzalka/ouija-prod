'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import styles from '../login/Login.module.scss'
import { useTranslation } from '@/i18n/translations'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface FormErrors {
  password?: string
  confirm?: string
}

type TFunction = ReturnType<typeof useTranslation>['t']

function validatePassword(password: string, t: TFunction): string | undefined {
  if (!password) return t('resetPassword.errorPasswordRequired')
  if (password.length < 8) return t('resetPassword.errorPasswordShort')
  if (!/[A-Z]/.test(password)) return t('resetPassword.errorPasswordUppercase')
  if (!/[0-9]/.test(password)) return t('resetPassword.errorPasswordDigit')
}

function validateConfirm(
  password: string,
  confirm: string,
  t: TFunction
): string | undefined {
  if (!confirm) return t('resetPassword.errorConfirmRequired')
  if (password !== confirm) return t('resetPassword.errorPasswordMatch')
}

function ResetPasswordContent() {
  const params = useSearchParams()
  const token = params.get('token')
  const { t } = useTranslation()

  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>(
    'idle'
  )
  const [serverError, setServerError] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  if (!token) {
    return (
      <div className={styles.Form}>
        <label className={styles.FormLabel}>
          {t('resetPassword.invalidLinkTitle')}
        </label>
        <p
          style={{
            color: '#ff6b6b',
            fontSize: '1.5rem',
            fontWeight: 200,
            margin: '1rem 0'
          }}
        >
          {t('resetPassword.invalidLinkText')}
        </p>
        <Link href={'/forgot-password'} className={styles.Link}>
          <p>
            <span className={styles.Underline}>
              {t('resetPassword.requestNew')}
            </span>
          </p>
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setServerError('')

    const form = e.currentTarget
    const newPassword = (
      form.elements.namedItem('password') as HTMLInputElement
    ).value
    const confirm = (
      form.elements.namedItem('password-confirm') as HTMLInputElement
    ).value

    const newErrors: FormErrors = {
      password: validatePassword(newPassword, t),
      confirm: validateConfirm(newPassword, confirm, t)
    }
    setTouched({ password: true, confirm: true })
    setErrors(newErrors)
    if (Object.values(newErrors).some(Boolean)) return

    setStatus('loading')

    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      })

      const data = await res.json()

      if (!res.ok) {
        setServerError(data.error || t('resetPassword.errorServer'))
        setStatus('error')
        return
      }

      setStatus('done')
    } catch {
      setServerError(t('resetPassword.errorServer'))
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className={styles.Form}>
        <label className={styles.FormLabel}>
          {t('resetPassword.doneTitle')}
        </label>
        <p
          style={{
            color: 'var(--text-primary)',
            fontSize: '1.5rem',
            fontWeight: 200,
            margin: '1rem 0'
          }}
        >
          {t('resetPassword.doneText')}
        </p>
        <Link href={'/login'} className={styles.Link}>
          <p>
            {t('resetPassword.goTo')}{' '}
            <span className={styles.Underline}>
              {t('resetPassword.goToLoginLink')}
            </span>
          </p>
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={styles.Form} noValidate>
      <label htmlFor={'password'} className={styles.FormLabel}>
        {t('resetPassword.title')}
      </label>

      <input
        type={'password'}
        placeholder={t('resetPassword.newPassword')}
        name="password"
        id="password"
        className={styles.FormInput}
        onBlur={(e) => {
          setTouched((prev) => ({ ...prev, password: true }))
          setErrors((prev) => ({
            ...prev,
            password: validatePassword(e.target.value, t)
          }))
        }}
        aria-invalid={touched.password && !!errors.password}
      />
      {touched.password && errors.password && (
        <p
          style={{ color: '#ff6b6b', fontSize: '1.3rem', margin: '0.3rem 0 0' }}
        >
          {errors.password}
        </p>
      )}

      <label htmlFor={'password-confirm'} className={styles.FormLabel}>
        {t('resetPassword.confirmPassword')}
      </label>
      <input
        type={'password'}
        placeholder={t('resetPassword.confirmPassword')}
        name="password-confirm"
        id="password-confirm"
        className={styles.FormInput}
        onBlur={(e) => {
          const pwField = e.target.form?.elements.namedItem(
            'password'
          ) as HTMLInputElement
          setTouched((prev) => ({ ...prev, confirm: true }))
          setErrors((prev) => ({
            ...prev,
            confirm: validateConfirm(pwField?.value ?? '', e.target.value, t)
          }))
        }}
        aria-invalid={touched.confirm && !!errors.confirm}
      />
      {touched.confirm && errors.confirm && (
        <p
          style={{ color: '#ff6b6b', fontSize: '1.3rem', margin: '0.3rem 0 0' }}
        >
          {errors.confirm}
        </p>
      )}

      {(status === 'error' || serverError) && (
        <p style={{ color: '#ff6b6b', fontSize: '1.4rem', margin: '0.5rem 0' }}>
          {serverError}
        </p>
      )}

      <input
        type={'submit'}
        value={
          status === 'loading'
            ? t('resetPassword.submitting')
            : t('resetPassword.submit')
        }
        disabled={status === 'loading'}
        className={styles.FormSubmit}
      />
    </form>
  )
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div>Loading reset form...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
