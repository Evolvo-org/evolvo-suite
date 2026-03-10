import { Global, Module } from '@nestjs/common';

import { LogsController } from './logs.controller.js';
import { LogsService } from './logs.service.js';
import { RequestContextService } from './request-context.service.js';

@Global()
@Module({
	controllers: [LogsController],
	providers: [LogsService, RequestContextService],
	exports: [LogsService, RequestContextService],
})
export class LogsModule {}
