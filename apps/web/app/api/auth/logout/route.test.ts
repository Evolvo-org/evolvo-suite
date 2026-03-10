import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

vi.mock('../../../../src/features/auth/lib/server-auth', () => ({
  clearAuthSessionCookies: vi.fn(),
}));

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('redirects back to sign-in even when no cookie is present', async () => {
    const response = await POST(
      new Request('http://localhost:3001/api/auth/logout', {
        method: 'POST',
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('http://localhost:3001/sign-in');
  });

  it('forwards logout to the API when a session cookie exists', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      new Request('http://localhost:3001/api/auth/logout', {
        headers: {
          cookie: 'evolvo_session_token=token-123',
        },
        method: 'POST',
      }),
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/auth/logout',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer token-123',
        },
        method: 'POST',
      }),
    );
    expect(response.status).toBe(303);
  });
});
