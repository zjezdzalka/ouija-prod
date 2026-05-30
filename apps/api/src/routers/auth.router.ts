import { Router } from 'express'
import * as authController from '@controllers/auth.controller'

const authRouter = Router()

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
 *               password:  { type: string, minLength: 6 }
 *               nickname:  { type: string }
 *     responses:
 *       201: { description: Account created, verification email sent }
 *       400: { description: Validation error }
 *       409: { description: Email already in use }
 */
authRouter.post('/auth/register', authController.register)

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
authRouter.post('/auth/forgot-password', authController.forgotPassword)

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
 *               newPassword: { type: string, minLength: 6 }
 *     responses:
 *       200: { description: Password reset }
 *       400: { description: Invalid or expired token }
 */
authRouter.post('/auth/reset-password', authController.resetPassword)

authRouter.post('/auth/login', authController.login)
authRouter.post('/auth/logout', authController.logout)

export { authRouter }
