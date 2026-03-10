import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-query', () => ({
  useMutation: () => ({
    error: null,
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useQueryClient: () => ({
    setQueryData: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

import { SignInForm } from './sign-in-form';

describe('SignInForm', () => {
  it('renders the sign-in fields and redirect target copy', () => {
    const markup = renderToStaticMarkup(
      <SignInForm nextPath="/dashboard" />,
    );

    expect(markup).toContain('Operator sign-in');
    expect(markup).toContain('User ID');
    expect(markup).toContain('Display name');
    expect(markup).toContain('Email');
    expect(markup).toContain('Workspace key');
    expect(markup).toContain('/dashboard');
  });
});
