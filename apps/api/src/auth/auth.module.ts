import { Module } from '@nestjs/common';

import { LogsModule } from '../logs/logs.module.js';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { RolesGuard } from './roles.guard.js';
import { SessionAuthGuard } from './session-auth.guard.js';

@Module({
	imports: [LogsModule],
	controllers: [AuthController],
	providers: [AuthService, SessionAuthGuard, RolesGuard],
	exports: [AuthService, SessionAuthGuard, RolesGuard],
})
export class AuthModule {}
