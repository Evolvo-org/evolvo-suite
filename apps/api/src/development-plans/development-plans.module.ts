import { Module } from '@nestjs/common';

import { ProjectsModule } from '../projects/projects.module.js';
import { WorkflowModule } from '../workflow/workflow.module.js';

import { DevelopmentPlansController } from './development-plans.controller.js';
import { DevelopmentPlansService } from './development-plans.service.js';

@Module({
  imports: [ProjectsModule, WorkflowModule],
  controllers: [DevelopmentPlansController],
  providers: [DevelopmentPlansService],
  exports: [DevelopmentPlansService],
})
export class DevelopmentPlansModule {}
