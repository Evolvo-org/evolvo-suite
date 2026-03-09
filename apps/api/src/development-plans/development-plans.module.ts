import { Module } from '@nestjs/common';

import { ProjectsModule } from '../projects/projects.module';

import { DevelopmentPlansController } from './development-plans.controller';
import { DevelopmentPlansService } from './development-plans.service';

@Module({
  imports: [ProjectsModule],
  controllers: [DevelopmentPlansController],
  providers: [DevelopmentPlansService],
})
export class DevelopmentPlansModule {}
