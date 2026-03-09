export const projectLifecycleStatuses = ['draft', 'active', 'paused'] as const;

export type ProjectLifecycleStatus = (typeof projectLifecycleStatuses)[number];

export const runtimeConnectionStatuses = ['offline', 'online'] as const;

export type RuntimeConnectionStatus =
  (typeof runtimeConnectionStatuses)[number];
