/// <reference types="cypress" />

describe('Project worktrees', () => {
  it('renders worktree visibility and cleanup actions for a project', () => {
    cy.intercept('GET', '**/api/v1/projects/project-1', {
      id: 'project-1',
      name: 'Project One',
      slug: 'project-one',
      lifecycleStatus: 'active',
      repository: {
        provider: 'github',
        owner: 'acme',
        name: 'project-one',
        url: 'https://github.com/acme/project-one',
        defaultBranch: 'main',
        baseBranch: 'main',
      },
      queueLimits: {
        maxPlanning: 2,
        maxReadyForDev: 4,
        maxInDev: 2,
        maxReadyForReview: 2,
        maxInReview: 2,
        maxReadyForRelease: 2,
        maxReviewRetries: 2,
        maxMergeConflictRetries: 2,
        maxRuntimeRetries: 2,
        maxAmbiguityRetries: 1,
      },
      productSpecVersion: 3,
      activePlanVersionNumber: 2,
      metrics: {
        kanbanCounts: {
          inbox: 1,
          planning: 1,
          readyForDev: 2,
          inDev: 1,
          readyForReview: 1,
          inReview: 0,
          readyForRelease: 0,
          requiresHumanIntervention: 0,
          released: 2,
        },
        runtimeStatus: 'online',
        latestActivity: [],
      },
      createdAt: '2026-03-10T09:00:00.000Z',
      updatedAt: '2026-03-10T09:15:00.000Z',
    });

    cy.intercept('GET', '**/api/v1/projects/project-1/worktrees', {
      projectId: 'project-1',
      items: [
        {
          id: 'tree-1',
          projectId: 'project-1',
          workItemId: 'work-1',
          runtimeId: 'runtime-1',
          leaseId: 'lease-1',
          status: 'lockedByDev',
          path: '/worktrees/project-one/dev/work-1',
          branchName: 'evolvo/project-one/dev/work-1',
          baseBranch: 'main',
          headSha: 'abc123',
          pullRequestUrl: 'https://github.com/acme/project-one/pull/42',
          isDirty: false,
          details: 'Implementation is currently in progress.',
          lastSeenAt: '2026-03-10T09:15:00.000Z',
          cleanupRequestedAt: null,
          cleanupCompletedAt: null,
          createdAt: '2026-03-10T09:00:00.000Z',
          updatedAt: '2026-03-10T09:15:00.000Z',
        },
        {
          id: 'tree-2',
          projectId: 'project-1',
          workItemId: 'work-2',
          runtimeId: 'runtime-2',
          leaseId: null,
          status: 'stale',
          path: '/worktrees/project-one/dev/work-2',
          branchName: 'evolvo/project-one/dev/work-2',
          baseBranch: 'main',
          headSha: 'def456',
          pullRequestUrl: null,
          isDirty: true,
          details: 'Runtime heartbeat expired before cleanup.',
          lastSeenAt: '2026-03-10T09:10:00.000Z',
          cleanupRequestedAt: null,
          cleanupCompletedAt: null,
          createdAt: '2026-03-10T08:00:00.000Z',
          updatedAt: '2026-03-10T09:10:00.000Z',
        },
      ],
    });

    cy.intercept('POST', '**/api/v1/projects/project-1/worktrees/tree-2/cleanup', {
      success: true,
      message: 'Worktree cleanup requested successfully.',
      data: {
        id: 'tree-2',
        projectId: 'project-1',
        workItemId: 'work-2',
        runtimeId: 'runtime-2',
        leaseId: null,
        status: 'cleanupPending',
        path: '/worktrees/project-one/dev/work-2',
        branchName: 'evolvo/project-one/dev/work-2',
        baseBranch: 'main',
        headSha: 'def456',
        pullRequestUrl: null,
        isDirty: true,
        details: 'Cleanup requested from operator UI for evolvo/project-one/dev/work-2.',
        lastSeenAt: '2026-03-10T09:10:00.000Z',
        cleanupRequestedAt: '2026-03-10T09:16:00.000Z',
        cleanupCompletedAt: null,
        createdAt: '2026-03-10T08:00:00.000Z',
        updatedAt: '2026-03-10T09:16:00.000Z',
      },
    });

    cy.visit('/projects/project-1/worktrees');

    cy.contains('Worktrees for Project One').should('be.visible');
    cy.contains('evolvo/project-one/dev/work-1').should('be.visible');
    cy.contains('https://github.com/acme/project-one/pull/42').should(
      'be.visible',
    );
    cy.get('[data-cy="dirty-worktree-badge"]').should('be.visible');
    cy.contains('Request cleanup').should('be.visible');
  });
});
