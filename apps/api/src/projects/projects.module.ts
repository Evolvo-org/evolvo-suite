import { Module } from '@nestjs/common';

import { ManagementModule } from '../management/management.module.js';
import { SettingsModule } from '../settings/settings.module.js';

import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';

@Module({
  imports: [ManagementModule, SettingsModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
