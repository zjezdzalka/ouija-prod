import { Request, Response } from 'express'
import * as authService from '@services/auth.service'
import * as sessionService from '@services/session.service'
import { features } from '@/lib'

/**
 * GET /api/auth/config
 * Returns which auth features are enabled so the frontend can adapt its UI.
 */
export const getConfig = (_req: Request, res: Response) => {
  res.json({
    requireEmailVerification: features.REQUIRE_EMAIL_VERIFICATION,
    enablePasswordReset: features.ENABLE_PASSWORD_RESET
  })
}

/**
 * POST /api/auth/register
 * Body: { email, password, nickname }
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, nickname } = req.body
    const { user, requiresVerification } = await authService.register({
      email,
      password,
      nickname
    })
    res.status(201).json({
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      emailVerified: user.emailVerified,
      requiresVerification,
      message: requiresVerification
        ? 'Account created. Please check your email to verify your address.'
        : 'Account created successfully.'
    })
  } catch (error) {
    const msg = (error as Error).message
    const status = msg === 'user already exists' ? 409 : 400
    res.status(status).json({ error: msg })
  }
}

/**
 * GET /api/auth/verify-email?token=<token>
 */
export const verifyEmail = async (req: Request, res: Response) => {
  if (!features.REQUIRE_EMAIL_VERIFICATION) {
    return res.status(404).json({ error: 'email verification is not enabled' })
  }
  try {
    const { token } = req.query
    await authService.verifyEmail(token as string)
    res.status(200).json({ message: 'Email verified successfully.' })
  } catch (error) {
    res.status(400).json({ error: (error as Error).message })
  }
}

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Always returns 204 to prevent user enumeration.
 */
export const forgotPassword = async (req: Request, res: Response) => {
  if (!features.ENABLE_PASSWORD_RESET) {
    return res.status(404).json({ error: 'password reset is not enabled' })
  }
  try {
    const { email } = req.body
    await authService.forgotPassword(email)
  } catch {
    // swallow — still return 204
  }
  res.status(204).send()
}

/**
 * POST /api/auth/reset-password
 * Body: { token, newPassword }
 */
export const resetPassword = async (req: Request, res: Response) => {
  if (!features.ENABLE_PASSWORD_RESET) {
    return res.status(404).json({ error: 'password reset is not enabled' })
  }
  try {
    const { token, newPassword } = req.body
    await authService.resetPassword(token, newPassword)
    res.status(200).json({ message: 'Password reset successfully.' })
  } catch (error) {
    res.status(400).json({ error: (error as Error).message })
  }
}

/**
 * POST /api/auth/login
 * Body: { nickname, password }
 * Returns: { token, user }
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { nickname, password } = req.body
    const result = await sessionService.login(nickname, password)
    res.status(200).json(result)
  } catch (error) {
    const msg = (error as Error).message
    const status = msg === 'email not verified' ? 403 : 401
    res.status(status).json({ error: msg })
  }
}

/**
 * POST /api/auth/logout
 * Header: Authorization: Bearer <token>
 */
export const logout = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.slice(7) ?? ''
  await sessionService.logout(token)
  res.status(204).send()
}
