import { HttpStatus } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { HttpExceptionFilter } from './http-exception.filter.js';

describe('HttpExceptionFilter', () => {
  it('returns actionable schema-drift details for missing database columns', () => {
    const logsService = {
      writeLog: vi.fn().mockResolvedValue(undefined),
    };
    const requestContextService = {
      getCorrelationIdFromRequest: vi.fn().mockReturnValue('corr-123'),
    };
    const response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const request = {
      method: 'POST',
      url: '/api/v1/projects/project-1/development-plan/approve',
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as ArgumentsHost;
    const filter = new HttpExceptionFilter(
      logsService as never,
      requestContextService as never,
    );

    filter.catch(
      new Error(
        'The column `DevelopmentPlan.planningApprovedAt` does not exist in the current database.',
      ),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'The server database schema is out of date.',
        errors: [
          'A required database table or column is missing in the deployed environment.',
          'Run the latest database migrations for the API before retrying the request.',
        ],
        correlationId: 'corr-123',
      }),
    );
    expect(logsService.writeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'request.error',
        correlationId: 'corr-123',
        payload: expect.objectContaining({
          exceptionName: 'Error',
          rawMessage:
            'The column `DevelopmentPlan.planningApprovedAt` does not exist in the current database.',
        }),
      }),
    );
  });
});