export const projectLifecycleStatuses = ['draft', 'active', 'paused'] as const;

export type ProjectLifecycleStatus = (typeof projectLifecycleStatuses)[number];

export const projectRepositorySetupStatuses = [
  'pending',
  'inProgress',
  'ready',
  'failed',
] as const;

export type ProjectRepositorySetupStatus =
  (typeof projectRepositorySetupStatuses)[number];

export const runtimeConnectionStatuses = ['offline', 'online'] as const;

export type RuntimeConnectionStatus =
  (typeof runtimeConnectionStatuses)[number];
