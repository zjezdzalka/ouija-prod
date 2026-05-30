import { NextRequest, NextResponse } from 'next/server'

// Replace the host portion of a URL with a routable host derived from the request.
// If the configured URL already points at a real hostname (not localhost/127.0.0.1),
// it is returned as-is so production deployments with real domains are unaffected.
function resolveUrl(
  configured: string,
  requestHost: string,
  protocol: string
): string {
  const url = new URL(configured)
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    url.hostname = requestHost.split(':')[0]
    url.protocol = protocol + ':'
  }
  return url.toString().replace(/\/$/, '')
}

export async function GET(req: NextRequest) {
  const reqHost = req.headers.get('host') ?? 'localhost:3000'
  const protocol = req.headers.get('x-forwarded-proto') ?? 'http'

  const webUrl = resolveUrl(
    process.env.APP_URL ?? `http://localhost:3000`,
    reqHost,
    protocol
  )
  const apiUrl = resolveUrl(
    process.env.NEXT_PUBLIC_API_URL ?? `http://localhost:3001`,
    reqHost,
    protocol
  )
  const mediaUrl = resolveUrl(
    process.env.CDN_BASE_URL ?? `http://localhost:3001/api/media`,
    reqHost,
    protocol
  )

  return NextResponse.json({ web: webUrl, api: apiUrl, media: mediaUrl })
}
