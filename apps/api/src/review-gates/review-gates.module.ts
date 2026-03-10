import { Module } from '@nestjs/common';

import { ProjectsModule } from '../projects/projects.module.js';

import { ReviewGatesController } from './review-gates.controller.js';
import { ReviewGatesService } from './review-gates.service.js';

@Module({
	imports: [ProjectsModule],
	controllers: [ReviewGatesController],
	providers: [ReviewGatesService],
	exports: [ReviewGatesService],
})
export class ReviewGatesModule {}
