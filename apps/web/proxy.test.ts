import { describe, expect, it } from 'vitest';

import { proxy } from './proxy';

const createRequest = ({
  pathname,
  role,
  token,
}: {
  pathname: string;
  role?: string;
  token?: string;
}) =>
  ({
    cookies: {
      get: (name: string) => {
        if (name === 'evolvo_session_token' && token) {
          return { value: token };
        }

        if (name === 'evolvo_session_role' && role) {
          return { value: role };
        }

        return undefined;
      },
    },
    nextUrl: {
      pathname,
    },
    url: `http://localhost:3001${pathname}`,
  }) as never;

describe('proxy', () => {
  it('redirects unauthenticated protected routes to sign-in', () => {
    const response = proxy(createRequest({ pathname: '/dashboard' }));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3001/sign-in?next=%2Fdashboard',
    );
  });

  it('redirects role-restricted routes back to the dashboard', () => {
    const response = proxy(
      createRequest({
        pathname: '/projects/new',
        role: 'viewer',
        token: 'token-123',
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3001/dashboard',
    );
  });

  it('allows authenticated requests through when access is permitted', () => {
    const response = proxy(
      createRequest({
        pathname: '/projects/project-1/usage',
        role: 'reviewer',
        token: 'token-123',
      }),
    );

    expect(response.status).toBe(200);
  });
});
