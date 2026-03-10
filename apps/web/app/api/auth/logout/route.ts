import { getApiBaseUrl } from '@repo/api-client';
import { NextResponse } from 'next/server';

import { authSessionCookieName } from '../../../../src/features/auth/lib/auth-cookie';
import { clearAuthSessionCookies } from '../../../../src/features/auth/lib/server-auth';

export async function POST(request: Request) {
  const nextUrl = new URL(request.url);
  const redirectUrl = new URL('/sign-in', nextUrl);
  const accessToken =
    request.headers
      .get('cookie')
      ?.split(';')
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${authSessionCookieName}=`))
      ?.slice(`${authSessionCookieName}=`.length) ?? null;

  if (accessToken) {
    await fetch(`${getApiBaseUrl()}/auth/logout`, {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${decodeURIComponent(accessToken)}`,
      },
      method: 'POST',
    }).catch(() => undefined);
  }

  const response = NextResponse.redirect(redirectUrl, { status: 303 });
  clearAuthSessionCookies(response.cookies);

  return response;
}
