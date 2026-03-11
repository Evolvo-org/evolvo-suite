import { Module } from '@nestjs/common';

import { InterventionsModule } from '../interventions/interventions.module.js';
import { ManagementModule } from '../management/management.module.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { SchedulerModule } from '../scheduler/scheduler.module.js';
import { WorkflowModule } from '../workflow/workflow.module.js';

import { RuntimeController } from './runtime.controller.js';
import { RuntimeService } from './runtime.service.js';

@Module({
	imports: [InterventionsModule, ManagementModule, ProjectsModule, SchedulerModule, WorkflowModule],
	controllers: [RuntimeController],
	providers: [RuntimeService],
	exports: [RuntimeService],
})
export class RuntimeModule {}
