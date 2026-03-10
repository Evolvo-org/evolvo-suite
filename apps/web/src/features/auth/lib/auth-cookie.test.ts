import { describe, expect, it } from 'vitest';

import {
  authAccessTokenStorageKey,
  authRoleCookieName,
  authSessionCookieName,
  defaultAuthenticatedPath,
  sanitizeReturnTo,
} from './auth-cookie';

describe('auth-cookie', () => {
  it('exports stable auth storage keys', () => {
    expect(authSessionCookieName).toBe('evolvo_session_token');
    expect(authRoleCookieName).toBe('evolvo_session_role');
    expect(authAccessTokenStorageKey).toBe('evolvo.access-token');
  });

  it('keeps safe internal return targets', () => {
    expect(sanitizeReturnTo('/projects/project-1')).toBe('/projects/project-1');
    expect(sanitizeReturnTo('/dashboard')).toBe('/dashboard');
  });

  it('falls back to the authenticated home for unsafe targets', () => {
    expect(sanitizeReturnTo(undefined)).toBe(defaultAuthenticatedPath);
    expect(sanitizeReturnTo('https://example.com')).toBe(
      defaultAuthenticatedPath,
    );
    expect(sanitizeReturnTo('//example.com')).toBe(
      defaultAuthenticatedPath,
    );
    expect(sanitizeReturnTo('/api/auth/session')).toBe(
      defaultAuthenticatedPath,
    );
    expect(sanitizeReturnTo('/sign-in?next=/dashboard')).toBe(
      defaultAuthenticatedPath,
    );
  });
});
