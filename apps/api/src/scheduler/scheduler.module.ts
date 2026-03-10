import { Module } from '@nestjs/common';

import { ProjectsModule } from '../projects/projects.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { WorkflowModule } from '../workflow/workflow.module.js';

import { SchedulerController } from './scheduler.controller.js';
import { SchedulerRetryPolicyService } from './scheduler-retry-policy.service.js';
import { SchedulerService } from './scheduler.service.js';

@Module({
	imports: [ProjectsModule, SettingsModule, WorkflowModule],
	controllers: [SchedulerController],
	providers: [SchedulerRetryPolicyService, SchedulerService],
	exports: [SchedulerRetryPolicyService, SchedulerService],
})
export class SchedulerModule {}
