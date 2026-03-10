import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestLoggingInterceptor } from './request-logging.interceptor.js';

describe('RequestLoggingInterceptor', () => {
  const now = new Date('2026-03-10T08:20:00.000Z');

  let logsService: {
    writeLog: ReturnType<typeof vi.fn>;
  };
  let interceptor: RequestLoggingInterceptor;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);

    logsService = {
      writeLog: vi.fn().mockResolvedValue(undefined),
    };

    interceptor = new RequestLoggingInterceptor(
      logsService as never,
      {
        getCorrelationIdFromRequest: vi.fn().mockReturnValue('corr-123'),
      } as never,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('logs request completion details', () => {
    const request = {
      method: 'GET',
      originalUrl: '/api/health',
    };
    const response = {
      statusCode: 200,
    };
    const context = {
      getType: vi.fn().mockReturnValue('http'),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: () => request,
        getResponse: () => response,
      }),
    };

    interceptor.intercept(context as never, {
      handle: () => of({ ok: true }),
    } as never).subscribe();

    expect(logsService.writeLog).toHaveBeenCalledOnce();
    expect(logsService.writeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'request.completed',
        correlationId: 'corr-123',
      }),
    );
  });

  it('logs slow requests separately', () => {
    const request = {
      method: 'POST',
      originalUrl: '/api/projects/project-1/automation/run',
    };
    const response = {
      statusCode: 200,
    };
    const context = {
      getType: vi.fn().mockReturnValue('http'),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: () => request,
        getResponse: () => response,
      }),
    };

    interceptor.intercept(context as never, {
      handle: () => {
        vi.advanceTimersByTime(1_250);
        return of({ ok: true });
      },
    } as never).subscribe();

    expect(logsService.writeLog).toHaveBeenCalledTimes(2);
    expect(logsService.writeLog).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        eventType: 'request.slow',
        level: 'warn',
      }),
    );
  });
});