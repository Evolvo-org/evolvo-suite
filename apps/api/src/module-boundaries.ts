export interface ModuleBoundaryDefinition {
  readonly name:
    | 'auth'
    | 'users'
    | 'projects'
    | 'planning'
    | 'workflow'
    | 'scheduler'
    | 'runtime'
    | 'worktrees'
    | 'agents'
    | 'releases'
    | 'usage'
    | 'billing'
    | 'realtime'
    | 'logs';
  readonly owns: readonly string[];
  readonly mayImport: readonly ModuleBoundaryDefinition['name'][];
}

export const moduleBoundaries: readonly ModuleBoundaryDefinition[] = [
  {
    name: 'auth',
    owns: ['identity, sessions, guards, role policies'],
    mayImport: ['users', 'logs'],
  },
  {
    name: 'users',
    owns: ['user profiles, operator records, memberships'],
    mayImport: ['logs'],
  },
  {
    name: 'projects',
    owns: ['project inventory, repository metadata, queue settings'],
    mayImport: ['logs'],
  },
  {
    name: 'planning',
    owns: ['product specs, development plans, future hierarchy read models'],
    mayImport: ['projects', 'logs'],
  },
  {
    name: 'workflow',
    owns: ['kanban transitions, transition rules, audit hooks'],
    mayImport: ['projects', 'planning', 'logs'],
  },
  {
    name: 'scheduler',
    owns: ['leases, selection, fairness, retries'],
    mayImport: ['workflow', 'runtime', 'logs'],
  },
  {
    name: 'runtime',
    owns: ['runtime registration, heartbeat, dispatch contracts'],
    mayImport: ['projects', 'logs'],
  },
  {
    name: 'worktrees',
    owns: ['worktree state, repository checkout metadata'],
    mayImport: ['projects', 'runtime', 'logs'],
  },
  {
    name: 'agents',
    owns: ['agent runs, prompts, decisions, artifacts'],
    mayImport: ['workflow', 'worktrees', 'runtime', 'logs'],
  },
  {
    name: 'releases',
    owns: ['versioning, tags, notes, release history'],
    mayImport: ['workflow', 'worktrees', 'logs'],
  },
  {
    name: 'usage',
    owns: ['metering, aggregation, quota calculations'],
    mayImport: ['agents', 'runtime', 'logs'],
  },
  {
    name: 'billing',
    owns: ['plans, invoices, entitlements'],
    mayImport: ['usage', 'users', 'logs'],
  },
  {
    name: 'realtime',
    owns: ['subscriptions, push events, query invalidation events'],
    mayImport: ['projects', 'workflow', 'runtime', 'logs'],
  },
  {
    name: 'logs',
    owns: ['structured logs, audit sinks, diagnostics'],
    mayImport: [],
  },
] as const;

export const moduleBoundaryRules = [
  'Import inward through published module exports only.',
  'Keep controllers thin and local to their owning module.',
  'Do not let sibling feature modules depend on each other bidirectionally.',
  'Promote shared concerns into dedicated modules instead of cross-importing services.',
] as const;
