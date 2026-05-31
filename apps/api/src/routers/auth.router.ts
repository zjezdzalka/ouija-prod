import { Router, Request, Response, NextFunction } from 'express'
import * as authController from '@controllers/auth.controller'
import rateLimit from 'express-rate-limit'
import { z, ZodSchema } from 'zod'

const authRouter = Router()

// ── Rate limiters ─────────────────────────────────────────────────────────────

/** Tight limit for login — prevents credential stuffing */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too many login attempts, please try again later' }
})

/** Moderate limit for registration */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too many accounts created from this IP, please try again later' }
})

/** Prevents email flood abuse on forgot-password */
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too many password reset requests, please try again later' }
})

/** Prevents token-bruteforce on reset-password */
const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too many password reset attempts, please try again later' }
})

const registerSchema = z.object({
  email: z.string().email('invalid email address'),
  password: z.string().min(8, 'password must be at least 8 characters'),
  nickname: z
    .string()
    .min(3, 'nickname must be at least 3 characters')
    .max(32, 'nickname must be at most 32 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'nickname may only contain letters, numbers, underscores and hyphens')
})

const loginSchema = z.object({
  nickname: z.string().min(1, 'nickname is required'),
  password: z.string().min(1, 'password is required')
})

const forgotPasswordSchema = z.object({
  email: z.string().email('invalid email address')
})

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'token is required'),
  newPassword: z.string().min(8, 'password must be at least 8 characters')
})

// ── Validation middleware factory ─────────────────────────────────────────────

function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({
        // Swapped .errors[0] to .issues[0]
        error: result.error.issues[0]?.message ?? 'invalid request body'
      })
      return
    }
    req.body = result.data
    next()
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/auth/config:
 *   get:
 *     summary: Get enabled auth feature flags
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Feature flags
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requireEmailVerification: { type: boolean }
 *                 enablePasswordReset:      { type: boolean }
 */
authRouter.get('/auth/config', authController.getConfig)

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, nickname]
 *             properties:
 *               email:     { type: string, format: email }
 *               password:  { type: string, minLength: 8 }
 *               nickname:  { type: string, minLength: 3, maxLength: 32 }
 *     responses:
 *       201: { description: Account created, verification email sent }
 *       400: { description: Validation error }
 *       409: { description: Email already in use }
 */
authRouter.post('/auth/register', registerLimiter, validate(registerSchema), authController.register)

/**
 * @swagger
 * /api/auth/verify-email:
 *   get:
 *     summary: Verify an email address
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Email verified }
 *       400: { description: Invalid or expired token }
 */
authRouter.get('/auth/verify-email', authController.verifyEmail)

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset link
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       204: { description: Reset email sent (or address not found — always 204) }
 */
authRouter.post('/auth/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), authController.forgotPassword)

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Set a new password using a reset token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token:       { type: string }
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       200: { description: Password reset }
 *       400: { description: Invalid or expired token }
 */
authRouter.post('/auth/reset-password', resetPasswordLimiter, validate(resetPasswordSchema), authController.resetPassword)

authRouter.post('/auth/login', loginLimiter, validate(loginSchema), authController.login)
authRouter.post('/auth/logout', authController.logout)

export { authRouter }
