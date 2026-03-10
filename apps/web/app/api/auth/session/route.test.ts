import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

vi.mock('../../../../src/features/auth/lib/server-auth', () => ({
  setAuthSessionCookies: vi.fn(),
}));

describe('POST /api/auth/session', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects invalid sign-in payloads', async () => {
    const response = await POST(
      new Request('http://localhost:3001/api/auth/session', {
        body: JSON.stringify({ role: 'invalid' }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: 'Invalid sign-in payload.',
    });
  });

  it('creates a session from the upstream API response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          data: {
            accessToken: 'token-123',
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
          },
          message: 'Authenticated successfully.',
          success: true,
        }),
        ok: true,
        status: 200,
      }),
    );

    const response = await POST(
      new Request('http://localhost:3001/api/auth/session', {
        body: JSON.stringify({
          email: 'operator@example.com',
          role: 'operator',
          userId: 'operator-1',
        }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      accessToken: 'token-123',
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
    });
  });
});
