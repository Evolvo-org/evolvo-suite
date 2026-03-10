import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ToastProvider, getErrorToastMessage } from './toast-provider';

describe('ToastProvider', () => {
  it('renders the notification region around children', () => {
    const markup = renderToStaticMarkup(
      <ToastProvider>
        <div>Dashboard content</div>
      </ToastProvider>,
    );

    expect(markup).toContain('Dashboard content');
    expect(markup).toContain('Notifications');
  });
});

describe('getErrorToastMessage', () => {
  it('prefers the error message when available', () => {
    expect(getErrorToastMessage(new Error('Request failed'), 'Fallback')).toBe(
      'Request failed',
    );
  });

  it('uses the fallback for non-error values', () => {
    expect(getErrorToastMessage('oops', 'Fallback')).toBe('Fallback');
  });
});
