import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'hashcode-community-secret-key-change-in-production'
);
const SESSION_COOKIE = 'hashcode_session';

const protectedPaths = ['/onboarding', '/profile', '/admin'];
const authPaths = ['/auth/verify', '/auth/verify-otp', '/auth/magic-link'];

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { memberId: payload.memberId, email: payload.email };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const publicPaths = ['/', '/auth', '/api/auth'];
  if (publicPaths.some((p) => path.startsWith(p))) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;

  let isAuthenticated = false;
  if (sessionToken) {
    const session = await verifyToken(sessionToken);
    isAuthenticated = !!session;
  }

  if (protectedPaths.some((p) => path.startsWith(p)) && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/verify';
    return NextResponse.redirect(url);
  }

  if (authPaths.some((p) => path.startsWith(p)) && isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/profile';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/onboarding/:path*', '/profile/:path*', '/admin/:path*', '/auth/:path*'],
};
