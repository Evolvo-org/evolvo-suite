import { Module } from '@nestjs/common';

import { DevelopmentPlansModule } from '../development-plans/development-plans.module.js';
import { ProductSpecsModule } from '../product-specs/product-specs.module.js';

@Module({
  imports: [ProductSpecsModule, DevelopmentPlansModule],
})
export class PlanningModule {}
