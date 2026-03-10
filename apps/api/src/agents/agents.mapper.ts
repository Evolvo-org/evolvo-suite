import type {
  AgentDecision,
  AgentFailure,
  AgentRun,
  AgentRunArtifact,
  PromptSnapshot,
} from '@repo/db/client';
import type {
  AgentArtifactRecord,
  AgentDecisionRecord,
  AgentFailureRecord,
  AgentRunListResponse,
  AgentRunRecord,
  PromptSnapshotRecord,
} from '@repo/shared';

const mapStatus = (value: AgentRun['status']): AgentRunRecord['status'] => {
  switch (value) {
    case 'COMPLETED':
      return 'completed';
    case 'FAILED':
      return 'failed';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'running';
  }
};

const mapArtifactType = (
  value: AgentRunArtifact['artifactType'],
): AgentArtifactRecord['artifactType'] => {
  switch (value) {
    case 'LOG':
      return 'log';
    case 'PATCH':
      return 'patch';
    case 'REPORT':
      return 'report';
    case 'PLAN':
      return 'plan';
    default:
      return 'other';
  }
};

const mapDecision = (decision: AgentDecision): AgentDecisionRecord => ({
  id: decision.id,
  decision: decision.decision,
  rationale: decision.rationale ?? null,
  createdAt: decision.createdAt.toISOString(),
});

const mapFailure = (failure: AgentFailure): AgentFailureRecord => ({
  id: failure.id,
  errorMessage: failure.errorMessage,
  details: failure.details ?? null,
  createdAt: failure.createdAt.toISOString(),
});

const mapPromptSnapshot = (
  snapshot: PromptSnapshot,
): PromptSnapshotRecord => ({
  id: snapshot.id,
  systemPrompt: snapshot.systemPrompt ?? null,
  userPrompt: snapshot.userPrompt ?? null,
  messagesJson: snapshot.messagesJson ?? null,
  createdAt: snapshot.createdAt.toISOString(),
  updatedAt: snapshot.updatedAt.toISOString(),
});

const mapArtifact = (artifact: AgentRunArtifact): AgentArtifactRecord => ({
  id: artifact.id,
  artifactType: mapArtifactType(artifact.artifactType),
  label: artifact.label,
  content: artifact.content ?? null,
  url: artifact.url ?? null,
  createdAt: artifact.createdAt.toISOString(),
});

export const mapAgentRun = (
  run: AgentRun & {
    promptSnapshot: PromptSnapshot | null;
    decisions: AgentDecision[];
    failure: AgentFailure | null;
    artifacts: AgentRunArtifact[];
  },
): AgentRunRecord => ({
  id: run.id,
  projectId: run.projectId,
  workItemId: run.workItemId,
  runtimeId: run.runtimeId ?? null,
  leaseId: run.leaseId ?? null,
  agentType: run.agentType,
  status: mapStatus(run.status),
  startedAt: run.startedAt.toISOString(),
  completedAt: run.completedAt?.toISOString() ?? null,
  summary: run.summary ?? null,
  promptSnapshot: run.promptSnapshot ? mapPromptSnapshot(run.promptSnapshot) : null,
  decisions: run.decisions.map(mapDecision),
  failure: run.failure ? mapFailure(run.failure) : null,
  artifacts: run.artifacts.map(mapArtifact),
  createdAt: run.createdAt.toISOString(),
  updatedAt: run.updatedAt.toISOString(),
});

export const mapAgentRunList = (
  projectId: string,
  workItemId: string,
  runs: Array<
    AgentRun & {
      promptSnapshot: PromptSnapshot | null;
      decisions: AgentDecision[];
      failure: AgentFailure | null;
      artifacts: AgentRunArtifact[];
    }
  >,
): AgentRunListResponse => ({
  projectId,
  workItemId,
  items: runs.map(mapAgentRun),
});
