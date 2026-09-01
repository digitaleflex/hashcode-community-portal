import { NextResponse, type NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/auth';

const protectedPaths = ['/onboarding', '/profile', '/admin'];
const authPaths = ['/auth/verify', '/auth/verify-otp', '/auth/magic-link'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const sessionToken = request.cookies.get('hashcode_session')?.value;

  let isAuthenticated = false;
  if (sessionToken) {
    const session = await verifySessionToken(sessionToken);
    isAuthenticated = !!session;
  }

  if (protectedPaths.some((p) => path.startsWith(p)) && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/verify';
    return NextResponse.redirect(url);
  }

  if (authPaths.some((p) => path.startsWith(p)) && isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/onboarding';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/onboarding/:path*', '/profile/:path*', '/admin/:path*', '/auth/:path*'],
};
