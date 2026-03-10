import { Module } from '@nestjs/common';

import { ProjectsModule } from '../projects/projects.module.js';
import { WorkflowModule } from '../workflow/workflow.module.js';

import { ReleasesController } from './releases.controller.js';
import { ReleasesService } from './releases.service.js';

@Module({
	imports: [ProjectsModule, WorkflowModule],
	controllers: [ReleasesController],
	providers: [ReleasesService],
	exports: [ReleasesService],
})
export class ReleasesModule {}
