import { Catch, HttpException, HttpStatus, Inject } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { Request, Response } from 'express';

import { LogsService } from '../../logs/logs.service.js';
import { RequestContextService } from '../../logs/request-context.service.js';

@Catch()
export class HttpExceptionFilter {
  public constructor(
    @Inject(LogsService)
    private readonly logsService: LogsService,
    @Inject(RequestContextService)
    private readonly requestContextService: RequestContextService,
  ) {}

  public catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';
    let errors: string[] | undefined;

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse) {
        const responseMessage =
          'message' in exceptionResponse
            ? exceptionResponse.message
            : undefined;

        if (typeof responseMessage === 'string') {
          message = responseMessage;
        }

        if (Array.isArray(responseMessage)) {
          errors = responseMessage.filter(
            (value): value is string => typeof value === 'string',
          );
          message = errors[0] ?? message;
        }
      }
    }

    const correlationId = this.requestContextService.getCorrelationIdFromRequest(
      request,
    );

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      void this.logsService.writeLog({
        level: 'error',
        source: 'api',
        eventType: 'request.error',
        message,
        correlationId,
        payload: {
          method: request.method,
          path: request.url,
          statusCode,
          errors,
          stack: exception instanceof Error ? exception.stack : null,
        },
      });
    }

    response.status(statusCode).json({
      statusCode,
      message,
      errors,
      correlationId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
