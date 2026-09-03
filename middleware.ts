import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { getJwtSecret } from '@/lib/auth'

const jwtSecret = getJwtSecret()

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value
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

    // Admin routes require admin role — check DB
    if (request.nextUrl.pathname.startsWith('/api/admin')) {
      const { requireAdmin } = await import('@/lib/auth')
      const db = (await import('@/lib/db')).db
      const { members } = await import('@/lib/db/schema')
      const { eq } = await import('drizzle-orm')
      const member = await db.query.members.findFirst({ where: eq(members.id, memberId) })
      if (!member || member.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Set headers for downstream routes
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-member-id', memberId)
    requestHeaders.set('x-member-email', email)
    return NextResponse.next({ request: { headers: requestHeaders } })
  } catch {
    const response = NextResponse.redirect(new URL('/auth/verify', request.url))
    response.cookies.delete('session')
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
