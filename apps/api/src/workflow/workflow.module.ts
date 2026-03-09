import { Module } from '@nestjs/common';

import { ProjectsModule } from '../projects/projects.module.js';

import { WorkflowController } from './workflow.controller.js';
import { WorkflowService } from './workflow.service.js';
import { WorkflowStateMachineService } from './workflow-state-machine.service.js';

@Module({
	imports: [ProjectsModule],
	controllers: [WorkflowController],
	providers: [WorkflowService, WorkflowStateMachineService],
	exports: [WorkflowService, WorkflowStateMachineService],
})
export class WorkflowModule {}
