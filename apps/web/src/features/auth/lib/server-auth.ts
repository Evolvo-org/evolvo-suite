import { getApiBaseUrl } from '@repo/api-client';
import type {
  CurrentUserResponse,
  LoginResponse,
} from '@repo/shared';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import {
  authRoleCookieName,
  authSessionCookieName,
} from './auth-cookie';

interface CookieOptions {
  expires?: Date;
  httpOnly?: boolean;
  path?: string;
  sameSite?: 'lax' | 'strict' | 'none';
  secure?: boolean;
}

interface CookieWriter {
  delete: (name: string) => void;
  set: (name: string, value: string, options: CookieOptions) => void;
}

interface ServerSessionSnapshot {
  accessToken: string | null;
  currentUser: CurrentUserResponse | null;
}

const buildCookieOptions = (expiresAt: string): CookieOptions => ({
  expires: new Date(expiresAt),
  httpOnly: true,
  path: '/',
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
});

const fetchCurrentUser = async (
  accessToken: string,
): Promise<CurrentUserResponse | null> => {
  const response = await fetch(`${getApiBaseUrl()}/auth/current-user`, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    method: 'GET',
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Current user lookup failed with status ${response.status}.`);
  }

  return (await response.json()) as CurrentUserResponse;
};

export const setAuthSessionCookies = (
  cookieWriter: CookieWriter,
  session: LoginResponse,
): void => {
  const cookieOptions = buildCookieOptions(session.currentUser.sessionExpiresAt);

  cookieWriter.set(authSessionCookieName, session.accessToken, cookieOptions);
  cookieWriter.set(authRoleCookieName, session.currentUser.role, cookieOptions);
};

export const clearAuthSessionCookies = (cookieWriter: CookieWriter): void => {
  cookieWriter.delete(authSessionCookieName);
  cookieWriter.delete(authRoleCookieName);
};

export const getServerSessionSnapshot = cache(
  async (): Promise<ServerSessionSnapshot> => {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(authSessionCookieName)?.value ?? null;

    if (!accessToken) {
      return {
        accessToken: null,
        currentUser: null,
      };
    }

    const currentUser = await fetchCurrentUser(accessToken);

    if (!currentUser) {
      return {
        accessToken: null,
        currentUser: null,
      };
    }

    return {
      accessToken,
      currentUser,
    };
  },
);

export const getOptionalCurrentUser = async (): Promise<CurrentUserResponse | null> =>
  (await getServerSessionSnapshot()).currentUser;

export const requireCurrentUser = async (
  requiredCapabilities: readonly string[] = [],
): Promise<CurrentUserResponse> => {
  const session = await getServerSessionSnapshot();

  if (!session.currentUser) {
    redirect('/sign-in');
  }

  const currentUser = session.currentUser;

  if (
    requiredCapabilities.length > 0 &&
    !requiredCapabilities.some((capability) =>
      currentUser.capabilities.includes(capability),
    )
  ) {
    redirect('/dashboard');
  }

  return currentUser;
};
