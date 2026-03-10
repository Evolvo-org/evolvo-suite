import type { LoginResponse } from '@repo/shared';
import { describe, expect, it, vi } from 'vitest';

import {
  clearAuthSessionCookies,
  setAuthSessionCookies,
} from './server-auth';

const createLoginResponse = (): LoginResponse => ({
  accessToken: 'access-token-123',
  currentUser: {
    adminBypassActive: false,
    capabilities: ['projects:write'],
    displayName: 'Operator One',
    email: 'operator@example.com',
    role: 'operator',
    sessionExpiresAt: '2026-03-17T12:00:00.000Z',
    userId: 'operator-1',
    workspaceKey: 'default',
  },
  tokenType: 'Bearer',
});

describe('server-auth', () => {
  it('writes both session cookies from a login response', () => {
    const cookieWriter = {
      delete: vi.fn(),
      set: vi.fn(),
    };

    setAuthSessionCookies(cookieWriter, createLoginResponse());

    expect(cookieWriter.set).toHaveBeenCalledTimes(2);
    expect(cookieWriter.set).toHaveBeenCalledWith(
      'evolvo_session_token',
      'access-token-123',
      expect.objectContaining({
        expires: new Date('2026-03-17T12:00:00.000Z'),
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
      }),
    );
    expect(cookieWriter.set).toHaveBeenCalledWith(
      'evolvo_session_role',
      'operator',
      expect.objectContaining({
        expires: new Date('2026-03-17T12:00:00.000Z'),
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
      }),
    );
  });

  it('clears both auth cookies on logout', () => {
    const cookieWriter = {
      delete: vi.fn(),
      set: vi.fn(),
    };

    clearAuthSessionCookies(cookieWriter);

    expect(cookieWriter.delete).toHaveBeenCalledWith('evolvo_session_token');
    expect(cookieWriter.delete).toHaveBeenCalledWith('evolvo_session_role');
  });
});
