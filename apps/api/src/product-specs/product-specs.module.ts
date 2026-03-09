import { Module } from '@nestjs/common';

import { ProjectsModule } from '../projects/projects.module';

import { ProductSpecsController } from './product-specs.controller';
import { ProductSpecsService } from './product-specs.service';

@Module({
  imports: [ProjectsModule],
  controllers: [ProductSpecsController],
  providers: [ProductSpecsService],
})
export class ProductSpecsModule {}
