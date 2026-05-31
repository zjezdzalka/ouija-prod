import { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'

/**
 * Attaches a correlation / request ID to every inbound request.
 *
 * - Reads `X-Request-Id` if the caller supplies one (useful for tracing
 *   across services or from a load-balancer).
 * - Falls back to a freshly generated UUID.
 * - Echoes the ID back in the response as `X-Request-Id` so clients can
 *   correlate their logs with server logs.
 * - Attaches it to `req` so controllers / services can thread it through
 *   to the structured logger.
 */
export interface CorrelatedRequest extends Request {
  correlationId: string
}

export const correlationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const id =
    (req.headers['x-request-id'] as string | undefined) ?? randomUUID()
  ;(req as CorrelatedRequest).correlationId = id
  res.setHeader('X-Request-Id', id)
  next()
}
