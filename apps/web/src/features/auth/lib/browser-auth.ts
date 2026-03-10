'use client';

import { configureApiClient } from '@repo/api-client';

import { authAccessTokenStorageKey } from './auth-cookie';

const hasBrowserWindow = (): boolean => typeof window !== 'undefined';

export const readStoredAccessToken = (): string | null => {
  if (!hasBrowserWindow()) {
    return null;
  }

  return window.localStorage.getItem(authAccessTokenStorageKey);
};

export const storeAccessToken = (accessToken: string): void => {
  if (!hasBrowserWindow()) {
    return;
  }

  window.localStorage.setItem(authAccessTokenStorageKey, accessToken);
};

export const clearStoredAccessToken = (): void => {
  if (!hasBrowserWindow()) {
    return;
  }

  window.localStorage.removeItem(authAccessTokenStorageKey);
};

export const configureBrowserApiClient = (
  fallbackAccessToken?: string | null,
): void => {
  const fallbackToken = fallbackAccessToken?.trim() || null;

  configureApiClient({
    defaultHeaders: () => {
      const accessToken = readStoredAccessToken() ?? fallbackToken;

      if (!accessToken) {
        return undefined;
      }

      return {
        Authorization: `Bearer ${accessToken}`,
      };
    },
  });
};
