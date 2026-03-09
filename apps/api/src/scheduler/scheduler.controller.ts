import { Body, Controller, Inject, Param, Post } from '@nestjs/common';
import type {
  AcquireSchedulerLeaseRequest,
  RecoverSchedulerLeasesRequest,
  RenewSchedulerLeaseRequest,
} from '@repo/shared';
import {
  acquireSchedulerLeaseSchema,
  recoverSchedulerLeasesSchema,
  renewSchedulerLeaseSchema,
} from '@repo/validation';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

import { SchedulerService } from './scheduler.service.js';

@Controller('scheduler')
export class SchedulerController {
  public constructor(
    @Inject(SchedulerService)
    private readonly schedulerService: SchedulerService,
  ) {}

  @Post('leases/acquire')
  public async acquireLease(
    @Body(new ZodValidationPipe(acquireSchedulerLeaseSchema))
    body: AcquireSchedulerLeaseRequest,
  ) {
    const lease = await this.schedulerService.acquireLease(body);

    return {
      success: true as const,
      message: lease.lease
        ? 'Scheduler lease acquired successfully.'
        : 'No eligible work item was available for lease.',
      data: lease,
    };
  }

  @Post('leases/:leaseId/renew')
  public async renewLease(
    @Param('leaseId') leaseId: string,
    @Body(new ZodValidationPipe(renewSchedulerLeaseSchema))
    body: RenewSchedulerLeaseRequest,
  ) {
    const lease = await this.schedulerService.renewLease(leaseId, body);

    return {
      success: true as const,
      message: 'Scheduler lease renewed successfully.',
      data: lease,
    };
  }

  @Post('leases/recover')
  public async recoverExpiredLeases(
    @Body(new ZodValidationPipe(recoverSchedulerLeasesSchema))
    body: RecoverSchedulerLeasesRequest,
  ) {
    const recovery = await this.schedulerService.recoverExpiredLeases(body);

    return {
      success: true as const,
      message: 'Expired scheduler leases recovered successfully.',
      data: recovery,
    };
  }
}
