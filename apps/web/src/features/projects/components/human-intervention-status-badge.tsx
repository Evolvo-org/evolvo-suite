'use client';

import type { HumanInterventionStatus } from '@repo/shared';
import { Badge } from '@repo/ui/components/badge/badge';

const badgeCopy: Record<
  HumanInterventionStatus,
  { label: string; tone: 'warning' | 'success' }
> = {
  open: {
    label: 'Open',
    tone: 'warning',
  },
  resolved: {
    label: 'Resolved',
    tone: 'success',
  },
};

export const HumanInterventionStatusBadge = ({
  status,
}: {
  status: HumanInterventionStatus;
}) => {
  const copy = badgeCopy[status];

  return <Badge tone={copy.tone}>{copy.label}</Badge>;
};
