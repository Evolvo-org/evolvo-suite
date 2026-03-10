import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  canRoleAccessPath,
  getRequiredCapabilitiesForPathname,
  isProtectedPath,
} from './src/features/auth/lib/access-control';
import {
  authRoleCookieName,
  authSessionCookieName,
  sanitizeReturnTo,
} from './src/features/auth/lib/auth-cookie';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(authSessionCookieName)?.value;

  if (!accessToken) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('next', sanitizeReturnTo(pathname));
    return NextResponse.redirect(signInUrl);
  }

  const requiredCapabilities = getRequiredCapabilitiesForPathname(pathname);
  const role = request.cookies.get(authRoleCookieName)?.value;

  if (
    role &&
    requiredCapabilities &&
    requiredCapabilities.length > 0 &&
    !canRoleAccessPath(role as 'admin' | 'operator' | 'reviewer' | 'viewer', pathname)
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
