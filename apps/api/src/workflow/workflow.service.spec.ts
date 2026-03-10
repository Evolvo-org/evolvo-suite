import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkflowService } from './workflow.service.js';

describe('WorkflowService', () => {
  let prisma: {
    workItem: {
      findFirst: ReturnType<typeof vi.fn>;
    };
    workItemComment: {
      findMany: ReturnType<typeof vi.fn>;
    };
    workItemStateTransition: {
      findMany: ReturnType<typeof vi.fn>;
    };
    agentRun: {
      findMany: ReturnType<typeof vi.fn>;
    };
    reviewGateResult: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };
  let service: WorkflowService;

  beforeEach(() => {
    prisma = {
      workItem: {
        findFirst: vi.fn().mockResolvedValue({ id: 'work-1' }),
      },
      workItemComment: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'comment-1',
            workItemId: 'work-1',
            actorType: 'HUMAN',
            actorName: 'Operator',
            content: 'Waiting on a fresh build.',
            createdAt: new Date('2026-03-09T12:05:00.000Z'),
            updatedAt: new Date('2026-03-09T12:05:00.000Z'),
          },
        ]),
      },
      workItemStateTransition: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'transition-1',
            projectId: 'project-1',
            workItemId: 'work-1',
            fromState: 'IN_DEV',
            toState: 'READY_FOR_REVIEW',
            reason: 'Development finished.',
            isOperatorOverride: false,
            createdAt: new Date('2026-03-09T12:04:00.000Z'),
          },
        ]),
      },
      agentRun: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'run-1',
            projectId: 'project-1',
            workItemId: 'work-1',
            runtimeId: 'runtime-1',
            leaseId: 'lease-1',
            agentType: 'review',
            status: 'FAILED',
            startedAt: new Date('2026-03-09T12:02:00.000Z'),
            completedAt: new Date('2026-03-09T12:03:30.000Z'),
            summary: 'Reported failing acceptance criteria.',
            createdAt: new Date('2026-03-09T12:02:00.000Z'),
            updatedAt: new Date('2026-03-09T12:03:30.000Z'),
            decisions: [
              {
                id: 'decision-1',
                agentRunId: 'run-1',
                decision: 'Return to development',
                rationale: 'Acceptance criteria failed.',
                createdAt: new Date('2026-03-09T12:03:00.000Z'),
              },
            ],
            failure: {
              id: 'failure-1',
              agentRunId: 'run-1',
              errorMessage: 'Acceptance criteria did not pass.',
              details: null,
              createdAt: new Date('2026-03-09T12:03:10.000Z'),
            },
            artifacts: [
              {
                id: 'artifact-1',
                agentRunId: 'run-1',
                artifactType: 'REPORT',
                label: 'Review summary',
                content: null,
                url: null,
                createdAt: new Date('2026-03-09T12:03:05.000Z'),
              },
            ],
          },
        ]),
      },
      reviewGateResult: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'gate-1',
            projectId: 'project-1',
            workItemId: 'work-1',
            runtimeId: 'runtime-1',
            leaseId: 'lease-1',
            agentRunId: 'run-1',
            overallStatus: 'FAILED',
            summary: 'One acceptance criterion failed.',
            createdAt: new Date('2026-03-09T12:03:00.000Z'),
            updatedAt: new Date('2026-03-09T12:03:00.000Z'),
            checks: [
              {
                id: 'check-1',
                reviewGateResultId: 'gate-1',
                name: 'TEST',
                status: 'PASSED',
                details: null,
                createdAt: new Date('2026-03-09T12:03:00.000Z'),
              },
              {
                id: 'check-2',
                reviewGateResultId: 'gate-1',
                name: 'ACCEPTANCE_CRITERIA',
                status: 'FAILED',
                details: 'Criterion 2 is incomplete.',
                createdAt: new Date('2026-03-09T12:03:01.000Z'),
              },
            ],
          },
        ]),
      },
    };

    service = new WorkflowService(
      prisma as never,
      { ensureProjectExists: vi.fn() } as never,
      { writeLog: vi.fn() } as never,
      { emitWorkflowTransitioned: vi.fn() } as never,
      { assertTransition: vi.fn() } as never,
    );
  });

  it('aggregates comments, transitions, agent runs, and review gate results into a timeline', async () => {
    const result = await service.getWorkItemAuditTrail('project-1', 'work-1');

    expect(prisma.agentRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 'project-1', workItemId: 'work-1' },
      }),
    );
    expect(prisma.reviewGateResult.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 'project-1', workItemId: 'work-1' },
      }),
    );
    expect(result.items.map((item) => item.type)).toEqual([
      'comment',
      'transition',
      'reviewGate',
      'agentRun',
    ]);
    expect(result.items[2]).toMatchObject({
      type: 'reviewGate',
      actorName: 'Review gate engine',
      metadata: {
        reviewGateOverallStatus: 'failed',
        reviewGatePassedChecks: 1,
        reviewGateFailedChecks: 1,
        reviewGateTotalChecks: 2,
        relatedAgentRunId: 'run-1',
      },
    });
    expect(result.items[3]).toMatchObject({
      type: 'agentRun',
      actorName: 'Review agent',
      metadata: {
        agentType: 'review',
        agentRunStatus: 'failed',
        decisionCount: 1,
        artifactCount: 1,
        failureMessage: 'Acceptance criteria did not pass.',
      },
    });
  });
});