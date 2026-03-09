import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { pathToFileURL } from 'node:url';

import { AppModule } from './app/app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor.js';
import type { ApplicationEnvironment } from './config/environment.js';

export const configureApiApp = (
  app: INestApplication,
  configService: ConfigService<ApplicationEnvironment, true>,
): void => {
  const apiPrefix = configService.get('apiPrefix', { infer: true });
  const corsOrigin = configService.get('corsOrigin', { infer: true });

  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin,
    credentials: true,
  });
  app.setGlobalPrefix(apiPrefix);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());
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

const entrypointPath = process.argv[1];
const isDirectExecution =
  entrypointPath !== undefined &&
  import.meta.url === pathToFileURL(entrypointPath).href;

if (isDirectExecution) {
  void bootstrap();
}
