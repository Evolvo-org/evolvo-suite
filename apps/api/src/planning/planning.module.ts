import { Module } from '@nestjs/common';

import { DevelopmentPlansModule } from '../development-plans/development-plans.module.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { ProductSpecsModule } from '../product-specs/product-specs.module.js';

import { PlanningController } from './planning.controller.js';
import { PlanningService } from './planning.service.js';

@Module({
  imports: [ProjectsModule, ProductSpecsModule, DevelopmentPlansModule],
  controllers: [PlanningController],
  providers: [PlanningService],
  exports: [PlanningService],
})
export class PlanningModule {}
