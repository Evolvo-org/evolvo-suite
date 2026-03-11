import { Module } from '@nestjs/common';

import { ManagementService } from './management.service.js';

@Module({
  providers: [ManagementService],
  exports: [ManagementService],
})
export class ManagementModule {}