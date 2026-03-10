import { Module } from '@nestjs/common';

import { InterventionsModule } from '../interventions/interventions.module.js';
import { UsageModule } from '../usage/usage.module.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { ReviewGatesModule } from '../review-gates/review-gates.module.js';
import { ReleasesModule } from '../releases/releases.module.js';
import { SchedulerModule } from '../scheduler/scheduler.module.js';
import { WorkflowModule } from '../workflow/workflow.module.js';
import { WorktreesModule } from '../worktrees/worktrees.module.js';

import { AgentsController } from './agents.controller.js';
import { AgentsService } from './agents.service.js';
import { DevAgentController } from './dev-agent.controller.js';
import { DevAgentService } from './dev-agent.service.js';
import { InboxAgentController } from './inbox-agent.controller.js';
import { InboxAgentService } from './inbox-agent.service.js';
import { PlanningAgentController } from './planning-agent.controller.js';
import { PlanningAgentService } from './planning-agent.service.js';
import { ReleaseAgentController } from './release-agent.controller.js';
import { ReleaseAgentService } from './release-agent.service.js';
import { ReviewAgentController } from './review-agent.controller.js';
import { ReviewAgentService } from './review-agent.service.js';

@Module({
	imports: [
		InterventionsModule,
		ProjectsModule,
		ReleasesModule,
		ReviewGatesModule,
		SchedulerModule,
		UsageModule,
		WorkflowModule,
		WorktreesModule,
	],
	controllers: [
		AgentsController,
		DevAgentController,
		InboxAgentController,
		PlanningAgentController,
		ReleaseAgentController,
		ReviewAgentController,
	],
	providers: [
		AgentsService,
		DevAgentService,
		InboxAgentService,
		PlanningAgentService,
		ReleaseAgentService,
		ReviewAgentService,
	],
	exports: [
		AgentsService,
		DevAgentService,
		InboxAgentService,
		PlanningAgentService,
		ReleaseAgentService,
		ReviewAgentService,
	],
})
export class AgentsModule {}
