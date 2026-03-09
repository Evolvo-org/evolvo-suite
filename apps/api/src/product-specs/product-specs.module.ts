import { Module } from '@nestjs/common';

import { ProjectsModule } from '../projects/projects.module.js';

import { ProductSpecsController } from './product-specs.controller.js';
import { ProductSpecsService } from './product-specs.service.js';

@Module({
  imports: [ProjectsModule],
  controllers: [ProductSpecsController],
  providers: [ProductSpecsService],
})
export class ProductSpecsModule {}
