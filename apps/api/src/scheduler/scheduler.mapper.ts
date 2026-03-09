import type { WorkItemLease } from '@repo/db/client';
import type { SchedulerLease } from '@repo/shared';

const mapLane = (value: WorkItemLease['lane']): SchedulerLease['lane'] => {
  switch (value) {
    case 'REVIEW':
      return 'review';
    case 'RELEASE':
      return 'release';
    default:
      return 'dev';
  }
};

const mapStatus = (value: WorkItemLease['status']): SchedulerLease['status'] => {
  switch (value) {
    case 'EXPIRED':
      return 'expired';
    case 'RELEASED':
      return 'released';
    case 'RECOVERED':
      return 'recovered';
    default:
      return 'active';
  }
};

export const mapSchedulerLease = (
  lease: WorkItemLease & { workItem: { title: string } },
): SchedulerLease => ({
  id: lease.id,
  projectId: lease.projectId,
  workItemId: lease.workItemId,
  workItemTitle: lease.workItem.title,
  runtimeId: lease.runtimeId,
  lane: mapLane(lease.lane),
  status: mapStatus(lease.status),
  leaseToken: lease.leaseToken,
  leasedAt: lease.leasedAt.toISOString(),
  expiresAt: lease.expiresAt.toISOString(),
  renewedAt: lease.renewedAt?.toISOString() ?? null,
  releasedAt: lease.releasedAt?.toISOString() ?? null,
  recoveredAt: lease.recoveredAt?.toISOString() ?? null,
  recoveryReason: lease.recoveryReason ?? null,
});
