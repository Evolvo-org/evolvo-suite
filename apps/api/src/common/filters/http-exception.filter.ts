import { Catch, HttpException, HttpStatus, Inject } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { Prisma } from '@repo/db/client';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';

import { LogsService } from '../../logs/logs.service.js';
import { RequestContextService } from '../../logs/request-context.service.js';

type NormalizedExceptionDetails = {
  message: string;
  errors?: string[];
  errorCode?: string;
  exceptionName: string;
  rawMessage: string | null;
  meta?: Record<string, unknown>;
};

const schemaDriftErrorMessages = [
  'A required database table or column is missing in the deployed environment.',
  'Run the latest database migrations for the API before retrying the request.',
];

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const normalizeHttpException = (exception: HttpException): NormalizedExceptionDetails => {
  let message = 'Internal server error';
  let errors: string[] | undefined;

  const exceptionResponse = exception.getResponse();

  if (typeof exceptionResponse === 'string') {
    message = exceptionResponse;
  } else if (isRecord(exceptionResponse)) {
    const responseMessage =
      'message' in exceptionResponse ? exceptionResponse.message : undefined;

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

  return {
    message,
    errors,
    exceptionName: exception.name,
    rawMessage: exception.message,
  };
};

const normalizeUnknownException = (
  exception: unknown,
  statusCode: number,
): NormalizedExceptionDetails => {
  if (exception instanceof HttpException) {
    return normalizeHttpException(exception);
  }

  if (exception instanceof ZodError) {
    return {
      message: 'Validation failed.',
      errors: exception.issues.map((issue) => issue.message),
      exceptionName: exception.name,
      rawMessage: exception.message,
    };
  }

  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    if (exception.code === 'P2021' || exception.code === 'P2022') {
      return {
        message: 'The server database schema is out of date.',
        errors: schemaDriftErrorMessages,
        errorCode: exception.code,
        exceptionName: exception.name,
        rawMessage: exception.message,
        meta: isRecord(exception.meta) ? exception.meta : undefined,
      };
    }

    return {
      message:
        statusCode >= HttpStatus.INTERNAL_SERVER_ERROR
          ? 'A database request failed.'
          : exception.message,
      errors:
        statusCode >= HttpStatus.INTERNAL_SERVER_ERROR
          ? [exception.message]
          : undefined,
      errorCode: exception.code,
      exceptionName: exception.name,
      rawMessage: exception.message,
      meta: isRecord(exception.meta) ? exception.meta : undefined,
    };
  }

  if (
    exception instanceof Error &&
    /column .* does not exist|table .* does not exist/i.test(exception.message)
  ) {
    return {
      message: 'The server database schema is out of date.',
      errors: schemaDriftErrorMessages,
      exceptionName: exception.name,
      rawMessage: exception.message,
    };
  }

  if (exception instanceof Error) {
    return {
      message:
        statusCode >= HttpStatus.INTERNAL_SERVER_ERROR
          ? 'Internal server error'
          : exception.message,
      errors:
        statusCode >= HttpStatus.INTERNAL_SERVER_ERROR
          ? [exception.message]
          : undefined,
      exceptionName: exception.name,
      rawMessage: exception.message,
    };
  }

  return {
    message: 'Internal server error',
    exceptionName: 'UnknownError',
    rawMessage: null,
  };
};

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
        : exception instanceof ZodError
          ? HttpStatus.BAD_REQUEST
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const normalized = normalizeUnknownException(exception, statusCode);
    const message = normalized.message;
    const errors = normalized.errors;

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
          errorCode: normalized.errorCode ?? null,
          exceptionName: normalized.exceptionName,
          errors,
          rawMessage: normalized.rawMessage,
          meta: normalized.meta ?? null,
          stack: exception instanceof Error ? exception.stack : null,
        },
      });
    }

    response.status(statusCode).json({
      statusCode,
      message,
      errors,
      errorCode: normalized.errorCode,
      correlationId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
