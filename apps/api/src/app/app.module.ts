import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AgentsModule } from '../agents/agents.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { BillingModule } from '../billing/billing.module.js';
import { validateEnvironment } from '../config/environment.js';
import { HealthModule } from '../health/health.module.js';
import { LogsModule } from '../logs/logs.module.js';
import { PlanningModule } from '../planning/planning.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { ReleasesModule } from '../releases/releases.module.js';
import { RuntimeModule } from '../runtime/runtime.module.js';
import { SchedulerModule } from '../scheduler/scheduler.module.js';
import { UsersModule } from '../users/users.module.js';
import { UsageModule } from '../usage/usage.module.js';
import { WorkflowModule } from '../workflow/workflow.module.js';
import { WorktreesModule } from '../worktrees/worktrees.module.js';

const currentDirectoryPath = dirname(fileURLToPath(import.meta.url));
const rootEnvironmentFilePath = resolve(currentDirectoryPath, '../../../../.env');
const localEnvironmentFilePath = resolve(currentDirectoryPath, '../../.env');
const environmentFilePath = existsSync(rootEnvironmentFilePath)
  ? rootEnvironmentFilePath
  : localEnvironmentFilePath;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: environmentFilePath,
      validate: validateEnvironment,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    HealthModule,
    ProjectsModule,
    PlanningModule,
    WorkflowModule,
    SchedulerModule,
    RuntimeModule,
    WorktreesModule,
    AgentsModule,
    ReleasesModule,
    UsageModule,
    BillingModule,
    RealtimeModule,
    LogsModule,
  ],
})
export class AppModule {}
