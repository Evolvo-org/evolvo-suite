import { Module } from '@nestjs/common';

import { ProjectsModule } from '../projects/projects.module.js';
import { WorkflowModule } from '../workflow/workflow.module.js';

import { InterventionsController } from './interventions.controller.js';
import { InterventionsService } from './interventions.service.js';

@Module({
	imports: [ProjectsModule, WorkflowModule],
	controllers: [InterventionsController],
	providers: [InterventionsService],
	exports: [InterventionsService],
})
export class InterventionsModule {}
