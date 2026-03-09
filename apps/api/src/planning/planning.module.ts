import { Module } from '@nestjs/common';

import { DevelopmentPlansModule } from '../development-plans/development-plans.module';
import { ProductSpecsModule } from '../product-specs/product-specs.module';

@Module({
  imports: [ProductSpecsModule, DevelopmentPlansModule],
})
export class PlanningModule {}
