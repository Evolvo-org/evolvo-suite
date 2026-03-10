import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor.js';
import type { ApplicationEnvironment } from './config/environment.js';
import { LogsService } from './logs/logs.service.js';
import { RequestContextService } from './logs/request-context.service.js';

export const configureApiApp = (
  app: INestApplication,
  configService: ConfigService<ApplicationEnvironment, true>,
): void => {
  const apiPrefix = configService.get('apiPrefix', { infer: true });
  const corsOrigin = configService.get('corsOrigin', { infer: true });
  const logsService = app.get(LogsService);
  const requestContextService = app.get(RequestContextService);

  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin,
    credentials: true,
  });
  app.setGlobalPrefix(apiPrefix);
  app.use((request, response, next) => {
    requestContextService.run(request, response, next);
  });
  app.useGlobalFilters(
    new HttpExceptionFilter(logsService, requestContextService),
  );
  app.useGlobalInterceptors(
    new RequestLoggingInterceptor(logsService, requestContextService),
  );
};

export async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const logger = new Logger('Bootstrap');
  const configService =
    app.get<ConfigService<ApplicationEnvironment, true>>(ConfigService);
  const apiPrefix = configService.get('apiPrefix', { infer: true });
  const port = configService.get('port', { infer: true });

  configureApiApp(app, configService);

  await app.listen(port);
  logger.log(`API listening on http://localhost:${port}/${apiPrefix}`);
}

void bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error(
    'API failed during startup.',
    error instanceof Error ? error.stack : String(error),
  );
  process.exit(1);
});
