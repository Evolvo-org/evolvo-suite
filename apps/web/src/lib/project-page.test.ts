import { ApiClientError } from '@repo/api-client';
import { describe, expect, it } from 'vitest';

import { isNotFoundProjectError } from './project-page';

describe('isNotFoundProjectError', () => {
  it('returns true for 404 api client errors', () => {
    expect(
      isNotFoundProjectError(new ApiClientError('Project not found.', 404)),
    ).toBe(true);
  });

  it('returns false for non-404 failures', () => {
    expect(
      isNotFoundProjectError(new ApiClientError('Conflict.', 409)),
    ).toBe(false);
    expect(isNotFoundProjectError(new Error('Boom'))).toBe(false);
  });
});
