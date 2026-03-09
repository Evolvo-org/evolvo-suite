import { Badge } from '@repo/ui/components/badge/badge';
import type { ProjectLifecycleStatus } from '@repo/shared';

const toneByStatus: Record<
  ProjectLifecycleStatus,
  'neutral' | 'success' | 'warning'
> = {
  draft: 'neutral',
  active: 'success',
  paused: 'warning',
};

export const ProjectStatusBadge = ({
  status,
}: {
  status: ProjectLifecycleStatus;
}) => {
  return <Badge tone={toneByStatus[status]}>{status}</Badge>;
};
