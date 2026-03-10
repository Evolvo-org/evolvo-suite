'use client';

import { Badge } from '@repo/ui/components/badge/badge';
import type { ReleaseRunStatus } from '@repo/shared';

const toneMap: Record<ReleaseRunStatus, 'neutral' | 'success' | 'warning'> = {
  running: 'neutral',
  succeeded: 'success',
  failed: 'warning',
  cancelled: 'warning',
};

const labelMap: Record<ReleaseRunStatus, string> = {
  running: 'Running',
  succeeded: 'Succeeded',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export const ReleaseStatusBadge = ({
  status,
}: {
  status: ReleaseRunStatus;
}) => {
  return <Badge tone={toneMap[status]}>{labelMap[status]}</Badge>;
};
