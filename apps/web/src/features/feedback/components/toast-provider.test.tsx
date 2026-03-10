import React from 'react';
import { ApiClientError } from '@repo/api-client';
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

  it('includes structured API details and the correlation id when available', () => {
    expect(
      getErrorToastMessage(
        new ApiClientError('The server database schema is out of date.', 500, {
          message: 'The server database schema is out of date.',
          errors: [
            'A required database table or column is missing in the deployed environment.',
            'Run the latest database migrations for the API before retrying the request.',
          ],
          correlationId: 'corr-123',
        }),
        'Fallback',
      ),
    ).toBe(
      'The server database schema is out of date. A required database table or column is missing in the deployed environment. Run the latest database migrations for the API before retrying the request. Reference: corr-123',
    );
  });
});
