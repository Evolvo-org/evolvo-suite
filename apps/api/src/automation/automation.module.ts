import { Global, Module } from '@nestjs/common';

import { AgentsModule } from '../agents/agents.module.js';
import { ProjectsModule } from '../projects/projects.module.js';

import { AutomationController } from './automation.controller.js';
import { AutomationService } from './automation.service.js';

@Global()
@Module({
  imports: [AgentsModule, ProjectsModule],
  controllers: [AutomationController],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}
