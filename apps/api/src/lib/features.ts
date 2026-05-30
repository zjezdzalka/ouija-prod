/**
 * Feature flags for authentication behaviour.
 *
 * AUTH_REQUIRE_EMAIL_VERIFICATION=true  (default: false)
 *   When enabled, newly created accounts are marked unverified and a
 *   verification email is sent. Users whose email is unverified will
 *   receive a 403 on login until they click the link.
 *
 * AUTH_ENABLE_PASSWORD_RESET=true  (default: false)
 *   When enabled, the POST /api/auth/forgot-password and
 *   POST /api/auth/reset-password endpoints are active.
 *   Requires SMTP to be configured.
 *
 * Set both to false (or leave unset) for pure localhost hosting
 * where no SMTP server is available.
 */

export const REQUIRE_EMAIL_VERIFICATION =
  process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === 'true'

export const ENABLE_PASSWORD_RESET =
  process.env.AUTH_ENABLE_PASSWORD_RESET === 'true'
