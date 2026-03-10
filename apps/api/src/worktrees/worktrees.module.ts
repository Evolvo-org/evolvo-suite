import { Module } from '@nestjs/common';

import { ProjectsModule } from '../projects/projects.module.js';

import { WorktreesController } from './worktrees.controller.js';
import { WorktreesService } from './worktrees.service.js';

@Module({
	imports: [ProjectsModule],
	controllers: [WorktreesController],
	providers: [WorktreesService],
	exports: [WorktreesService],
})
export class WorktreesModule {}
