import { Module } from '@nestjs/common';

import { ProjectsModule } from '../projects/projects.module.js';
import { WorkflowModule } from '../workflow/workflow.module.js';

import { SchedulerController } from './scheduler.controller.js';
import { SchedulerService } from './scheduler.service.js';

@Module({
	imports: [ProjectsModule, WorkflowModule],
	controllers: [SchedulerController],
	providers: [SchedulerService],
	exports: [SchedulerService],
})
export class SchedulerModule {}
