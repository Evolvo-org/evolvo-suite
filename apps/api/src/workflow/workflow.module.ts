import { Module } from '@nestjs/common';

import { ProjectsModule } from '../projects/projects.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { SettingsModule } from '../settings/settings.module.js';

import { ReadyForDevPromotionService } from './ready-for-dev-promotion.service.js';
import { WorkflowController } from './workflow.controller.js';
import { WorkflowService } from './workflow.service.js';
import { WorkflowStateMachineService } from './workflow-state-machine.service.js';

@Module({
	imports: [ProjectsModule, RealtimeModule, SettingsModule],
	controllers: [WorkflowController],
	providers: [WorkflowService, WorkflowStateMachineService, ReadyForDevPromotionService],
	exports: [WorkflowService, WorkflowStateMachineService, ReadyForDevPromotionService],
})
export class WorkflowModule {}
