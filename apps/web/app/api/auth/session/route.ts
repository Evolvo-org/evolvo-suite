import type {
  LoginRequest,
  LoginResponse,
  MutationResponse,
} from '@repo/shared';
import { loginSchema } from '@repo/validation';
import { getApiBaseUrl } from '@repo/api-client';
import { NextResponse } from 'next/server';

import { setAuthSessionCookies } from '../../../../src/features/auth/lib/server-auth';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as LoginRequest | null;
  const parsedBody = loginSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        message: 'Invalid sign-in payload.',
      },
      { status: 400 },
    );
  }

  const upstreamResponse = await fetch(`${getApiBaseUrl()}/auth/login`, {
    body: JSON.stringify(parsedBody.data),
    cache: 'no-store',
    headers: {
      'content-type': 'application/json',
    },
    method: 'POST',
  });

  const upstreamPayload = (await upstreamResponse.json().catch(() => null)) as
    | MutationResponse<LoginResponse>
    | { message?: string }
    | null;

  if (!upstreamResponse.ok || !upstreamPayload || !('data' in upstreamPayload)) {
    return NextResponse.json(
      upstreamPayload ?? { message: 'Unable to sign in.' },
      { status: upstreamResponse.status || 500 },
    );
  }

  const response = NextResponse.json({
    accessToken: upstreamPayload.data.accessToken,
    currentUser: upstreamPayload.data.currentUser,
  });

  setAuthSessionCookies(response.cookies, upstreamPayload.data);

  return response;
}
