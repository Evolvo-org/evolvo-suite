import { Module } from '@nestjs/common';

import { ProjectsModule } from '../projects/projects.module.js';

import { DevelopmentPlansController } from './development-plans.controller.js';
import { DevelopmentPlansService } from './development-plans.service.js';

@Module({
  imports: [ProjectsModule],
  controllers: [DevelopmentPlansController],
  providers: [DevelopmentPlansService],
  exports: [DevelopmentPlansService],
})
export class DevelopmentPlansModule {}
