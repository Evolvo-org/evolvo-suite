import type { ResolvedAgentRouteResponse } from './agent-routing';
import type { AgentInputContract } from './agents';

export interface ExecuteDevTaskRequest {
  runtimeId?: string;
  leaseId?: string;
  worktreePath?: string;
  branchName?: string;
  baseBranch?: string;
  headSha?: string;
}

export interface DevAgentCheckResult {
  name: 'build' | 'lint' | 'typecheck' | 'test';
  status: 'passed';
  details: string;
}

export interface ExecuteDevTaskResponse {
  projectId: string;
  workItemId: string;
  route: ResolvedAgentRouteResponse;
  input: AgentInputContract;
  runId: string;
  usageEventId: string;
  worktreeId: string;
  worktreePath: string;
  branchName: string;
  headSha: string;
  artifactLabels: string[];
  checks: DevAgentCheckResult[];
  nextState: 'readyForReview';
  comment: string;
}
