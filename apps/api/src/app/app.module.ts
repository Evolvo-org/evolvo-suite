import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AgentsModule } from '../agents/agents.module';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { validateEnvironment } from '../config/environment';
import { HealthModule } from '../health/health.module';
import { LogsModule } from '../logs/logs.module';
import { PlanningModule } from '../planning/planning.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectsModule } from '../projects/projects.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ReleasesModule } from '../releases/releases.module';
import { RuntimeModule } from '../runtime/runtime.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { UsersModule } from '../users/users.module';
import { UsageModule } from '../usage/usage.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { WorktreesModule } from '../worktrees/worktrees.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
