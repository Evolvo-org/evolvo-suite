import { configureApiClient } from '@repo/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authAccessTokenStorageKey } from './auth-cookie';
import {
  clearStoredAccessToken,
  configureBrowserApiClient,
  readStoredAccessToken,
  storeAccessToken,
} from './browser-auth';

vi.mock('@repo/api-client', () => ({
  configureApiClient: vi.fn(),
}));

describe('browser-auth', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('reads, stores, and clears the browser access token', () => {
    expect(readStoredAccessToken()).toBeNull();

    storeAccessToken('token-123');
    expect(window.localStorage.getItem(authAccessTokenStorageKey)).toBe(
      'token-123',
    );
    expect(readStoredAccessToken()).toBe('token-123');

    clearStoredAccessToken();
    expect(readStoredAccessToken()).toBeNull();
  });

  it('configures the API client with the stored token first', () => {
    storeAccessToken('stored-token');

    configureBrowserApiClient('fallback-token');

    expect(configureApiClient).toHaveBeenCalledOnce();

    const configuration = vi.mocked(configureApiClient).mock.calls[0]?.[0];
    const defaultHeaders = configuration?.defaultHeaders;

    expect(typeof defaultHeaders).toBe('function');
    expect((defaultHeaders as () => HeadersInit | undefined)()).toEqual({
      Authorization: 'Bearer stored-token',
    });
  });

  it('falls back to the provided token when local storage is empty', () => {
    configureBrowserApiClient('fallback-token');

    const configuration = vi.mocked(configureApiClient).mock.calls[0]?.[0];
    const defaultHeaders = configuration?.defaultHeaders;

    expect((defaultHeaders as () => HeadersInit | undefined)()).toEqual({
      Authorization: 'Bearer fallback-token',
    });
  });
});
