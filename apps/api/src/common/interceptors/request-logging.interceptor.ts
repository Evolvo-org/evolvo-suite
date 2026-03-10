import { Inject, Injectable } from '@nestjs/common';
import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import { finalize } from 'rxjs';
import type { Observable } from 'rxjs';
import type { Request, Response } from 'express';

import { LogsService } from '../../logs/logs.service.js';
import { RequestContextService } from '../../logs/request-context.service.js';

const slowRequestThresholdMs = 1_000;

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  public constructor(
    @Inject(LogsService)
    private readonly logsService: LogsService,
    @Inject(RequestContextService)
    private readonly requestContextService: RequestContextService,
  ) {}

  public intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      finalize(() => {
        const durationMs = Date.now() - startedAt;
        const correlationId =
          this.requestContextService.getCorrelationIdFromRequest(request);
        const level =
          response.statusCode >= 500
            ? 'error'
            : response.statusCode >= 400
              ? 'warn'
              : 'info';

        void this.logsService.writeLog({
          level,
          source: 'api',
          eventType: 'request.completed',
          message: `${request.method} ${request.originalUrl} ${response.statusCode} ${durationMs}ms`,
          correlationId,
          payload: {
            method: request.method,
            path: request.originalUrl,
            statusCode: response.statusCode,
            durationMs,
          },
        });

        if (durationMs >= slowRequestThresholdMs) {
          void this.logsService.writeLog({
            level: 'warn',
            source: 'api',
            eventType: 'request.slow',
            message: `${request.method} ${request.originalUrl} exceeded the slow request threshold at ${durationMs}ms.`,
            correlationId,
            payload: {
              method: request.method,
              path: request.originalUrl,
              statusCode: response.statusCode,
              durationMs,
              thresholdMs: slowRequestThresholdMs,
            },
          });
        }
      }),
    );
  }
}
