import nodemailer from 'nodemailer'

/**
 * Email transport configured via environment variables.
 *
 * Required env vars:
 *   SMTP_HOST     - e.g. smtp.gmail.com, mail.yourdomain.com
 *   SMTP_PORT     - e.g. 587 (STARTTLS) or 465 (SSL)
 *   SMTP_SECURE   - "true" for port 465, leave unset for STARTTLS
 *   SMTP_USER     - SMTP username / email address
 *   SMTP_PASSWORD - SMTP password / app password
 *   SMTP_FROM     - "From" address, e.g. "Ouija <noreply@yourdomain.com>"
 *
 * Optional:
 *   APP_URL       - Base URL of the web app (default: http://localhost:3000)
 *
 * For local testing without a real SMTP server, set SMTP_HOST=localhost
 * and SMTP_PORT=1025, then run: npx maildev  (or any local SMTP catcher)
 */

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
})

const APP_URL = process.env.APP_URL || 'http://localhost:3000'
const FROM = process.env.SMTP_FROM || 'Ouija <noreply@ouija.local>'

export const sendVerificationEmail = async (
  to: string,
  token: string
): Promise<void> => {
  const link = `${APP_URL}/verify-email?token=${token}`
  await transporter.sendMail({
    from: FROM,
    to,
    subject: 'ouija is to be verified!',
    text: `ouija welcomes you!\n\nclick the link below to verify your email address.\nthe link expires in 24 hours.\n\n${link}\n\nif you did not create an account, you can safely ignore this email.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#1a1a2e">welcome to ouija 👋</h2>
        <p>click the button below to verify your email address.</p>
        <p style="color:#666;font-size:12px">the link expires in <strong>24 hours</strong>.</p>
        <a href="${link}"
           style="display:inline-block;margin:16px 0;padding:12px 24px;background:#14110f;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">
          verify email
        </a>
        <p style="color:#999;font-size:12px">
          or copy this link:<br><code>${link}</code>
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin-top:32px">
        <p style="color:#bbb;font-size:11px">if you didn't create an account you can ignore this email.</p>
      </div>
    `
  })
}

export const sendPasswordResetEmail = async (
  to: string,
  token: string
): Promise<void> => {
  const link = `${APP_URL}/reset-password?token=${token}`
  await transporter.sendMail({
    from: FROM,
    to,
    subject: 'Reset your Ouija password',
    text: `You requested a password reset.\n\nClick the link below to choose a new password.\nThe link expires in 1 hour.\n\n${link}\n\nIf you did not request this, you can safely ignore this email.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#1a1a2e">Reset your password 🔑</h2>
        <p>We received a request to reset the password for your Ouija account.</p>
        <p style="color:#666;font-size:12px">The link expires in <strong>1 hour</strong>.</p>
        <a href="${link}"
           style="display:inline-block;margin:16px 0;padding:12px 24px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">
          Reset Password
        </a>
        <p style="color:#999;font-size:12px">
          Or copy this link:<br><code>${link}</code>
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin-top:32px">
        <p style="color:#bbb;font-size:11px">If you didn't request a reset you can ignore this email.</p>
      </div>
    `
  })
}
