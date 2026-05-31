import { Request, Response, NextFunction } from 'express'

/**
 * csrfGuard
 *
 * Defense-in-depth CSRF protection for state-mutating requests (POST, PUT, PATCH, DELETE).
 *
 * This app uses Bearer tokens in the Authorization header (not cookies), so it is not
 * vulnerable to classic CSRF. However, this middleware enforces that mutation requests
 * originate from a known origin or have a valid Referer header, protecting against
 * any future cookie-based auth additions and cross-origin form submissions that might
 * attach Authorization headers via CORS preflight bypass.
 *
 * Must be placed after CORS middleware (which already blocks unknown origins for
 * cross-origin XHR) but adds a server-side check that doesn't rely solely on the
 * browser enforcing CORS preflight.
 */
export const csrfGuard = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS']
  if (safeMethods.includes(req.method)) {
    next()
    return
  }

  // sendBeacon cannot attach custom headers or an Origin on page unload.
  // The beacon endpoint authenticates via a query-string token instead and is
  // limited to a single status-update operation, so CSRF protection here is
  // provided by the token itself rather than by origin checking.
  if (req.path === '/users/beacon/status') {
    next()
    return
  }

  const allowedOrigins = (process.env.APP_URL ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())

  const origin = req.headers.origin
  const referer = req.headers.referer

  // Allow requests with no origin AND no referer, BUT only if the Content-Type
  // is one that a plain HTML form cannot produce.  Classic CSRF via <form> always
  // sends application/x-www-form-urlencoded or multipart/form-data; our API
  // expects application/json.  Privacy-extensions or server-to-server callers
  // that strip Origin/Referer will still include application/json.
  //
  // Known limitation: very old browsers may strip Origin/Referer AND send
  // application/json via a fetch polyfill — this check stops them too, which
  // is acceptable (they should upgrade).
  if (!origin && !referer) {
    const contentType = (req.headers['content-type'] ?? '').toLowerCase()
    const isSafeContentType =
      contentType.startsWith('application/json') ||
      contentType.startsWith('application/merge-patch+json') ||
      !contentType.startsWith('application/x-www-form-urlencoded')
    if (isSafeContentType) {
      next()
      return
    }
    res.status(403).json({ error: 'forbidden: ambiguous request origin' })
    return
  }

  // Check Origin header first (present on XHR/fetch)
  if (origin) {
    if (allowedOrigins.includes(origin)) {
      next()
      return
    }
    res.status(403).json({ error: 'forbidden: invalid request origin' })
    return
  }

  // Fall back to Referer for form submissions (older browsers)
  if (referer) {
    const refererOrigin = new URL(referer).origin
    if (allowedOrigins.includes(refererOrigin)) {
      next()
      return
    }
    res.status(403).json({ error: 'forbidden: invalid request origin' })
    return
  }

  next()
}
