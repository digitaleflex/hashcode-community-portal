import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { getJwtSecret } from '@/lib/edge-auth'

const jwtSecret = getJwtSecret()

export default async function proxy(request: NextRequest) {
  const token = request.cookies.get('hashcode_session')?.value
  if (!token) {
    // Allow public paths
    const publicPaths = ['/', '/auth', '/api/auth', '/api/members', '/api/stats', '/members', '/m', '/manifest.json']
    if (publicPaths.some(p => request.nextUrl.pathname === p || request.nextUrl.pathname.startsWith(p + '/'))) {
      return NextResponse.next()
    }
    return NextResponse.redirect(new URL('/auth/verify', request.url))
  }

  try {
    const { payload } = await jwtVerify(token, jwtSecret)
    const memberId = payload.memberId as string
    const email = payload.email as string

    // Admin authorization is enforced by requireAdmin() in /api/admin/* routes (source of truth).

    // Set headers for downstream routes
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-member-id', memberId)
    requestHeaders.set('x-member-email', email)
    return NextResponse.next({ request: { headers: requestHeaders } })
  } catch {
    const response = NextResponse.redirect(new URL('/auth/verify', request.url))
    response.cookies.delete('hashcode_session')
    return response
  }
}

export const config = {
  matcher: [
    '/profile/:path*',
    '/members/:path*',
    '/onboarding/:path*',
    '/admin/:path*',
    '/api/members/:path*',
    '/api/admin/:path*',
  ],
}
