import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

type RequestContextStore = {
  correlationId: string;
};

export const correlationIdHeaderName = 'x-correlation-id';

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContextStore>();

  public run(request: Request, response: Response, next: NextFunction): void {
    const correlationId =
      this.getCorrelationIdFromRequest(request) ?? randomUUID();

    request.headers[correlationIdHeaderName] = correlationId;
    response.setHeader(correlationIdHeaderName, correlationId);

    this.storage.run({ correlationId }, next);
  }

  public getCorrelationId(): string | null {
    return this.storage.getStore()?.correlationId ?? null;
  }

  public getCorrelationIdFromRequest(
    request:
      | Pick<Request, 'headers' | 'get'>
      | null
      | undefined,
  ): string | null {
    if (!request) {
      return this.getCorrelationId();
    }

    const headerValue =
      request.get?.(correlationIdHeaderName) ??
      request.headers[correlationIdHeaderName];

    if (Array.isArray(headerValue)) {
      return headerValue[0]?.trim() || null;
    }

    if (typeof headerValue === 'string') {
      return headerValue.trim() || null;
    }

    return this.getCorrelationId();
  }
}