'use client';

import { Badge } from '@repo/ui/components/badge/badge';
import type { WorktreeStatus } from '@repo/shared';

const statusLabelMap: Record<WorktreeStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  lockedByDev: 'Locked by dev',
  lockedByReview: 'Locked by review',
  lockedByRelease: 'Locked by release',
  stale: 'Stale',
  cleanupPending: 'Cleanup pending',
  archived: 'Archived',
  failed: 'Failed',
};

const statusToneMap: Record<
  WorktreeStatus,
  'neutral' | 'success' | 'warning'
> = {
  pending: 'neutral',
  active: 'success',
  lockedByDev: 'success',
  lockedByReview: 'success',
  lockedByRelease: 'success',
  stale: 'warning',
  cleanupPending: 'warning',
  archived: 'neutral',
  failed: 'warning',
};

export const WorktreeStatusBadge = ({
  status,
}: {
  status: WorktreeStatus;
}) => {
  return <Badge tone={statusToneMap[status]}>{statusLabelMap[status]}</Badge>;
};
