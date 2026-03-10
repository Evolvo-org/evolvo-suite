/// <reference types="cypress" />

describe('Project release history', () => {
  it('renders release runs, version metadata, and release notes', () => {
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

    cy.intercept('GET', '**/api/v1/projects/project-1/releases', {
      projectId: 'project-1',
      items: [
        {
          id: 'release-1',
          projectId: 'project-1',
          workItemId: 'work-1',
          workItemTitle: 'Launch queue monitoring',
          runtimeId: 'runtime-1',
          leaseId: 'lease-1',
          worktreeId: 'tree-1',
          status: 'succeeded',
          summary: 'Merged the feature branch and published v1.2.0.',
          errorMessage: null,
          mergeCommitSha: 'abc123',
          releaseUrl: 'https://github.com/acme/project-one/releases/tag/v1.2.0',
          startedAt: '2026-03-10T09:00:00.000Z',
          completedAt: '2026-03-10T09:05:00.000Z',
          version: {
            id: 'version-1',
            version: '1.2.0',
            tagName: 'v1.2.0',
            targetBranch: 'main',
            commitSha: 'abc123',
            createdAt: '2026-03-10T09:05:00.000Z',
            updatedAt: '2026-03-10T09:05:00.000Z',
          },
          note: {
            id: 'note-1',
            title: 'Release 1.2.0',
            content: '# Release 1.2.0\\n\\n- Queue monitoring shipped\\n- Runtime alerts improved',
            format: 'markdown',
            createdAt: '2026-03-10T09:05:00.000Z',
            updatedAt: '2026-03-10T09:05:00.000Z',
          },
          createdAt: '2026-03-10T09:00:00.000Z',
          updatedAt: '2026-03-10T09:05:00.000Z',
        },
        {
          id: 'release-2',
          projectId: 'project-1',
          workItemId: 'work-2',
          workItemTitle: 'Ship worktree controls',
          runtimeId: 'runtime-2',
          leaseId: 'lease-2',
          worktreeId: 'tree-2',
          status: 'failed',
          summary: 'Release failed during post-merge verification.',
          errorMessage: 'Smoke tests failed in production.',
          mergeCommitSha: null,
          releaseUrl: null,
          startedAt: '2026-03-09T08:00:00.000Z',
          completedAt: '2026-03-09T08:15:00.000Z',
          version: null,
          note: null,
          createdAt: '2026-03-09T08:00:00.000Z',
          updatedAt: '2026-03-09T08:15:00.000Z',
        },
      ],
    });

    cy.visit('/projects/project-1/releases');

    cy.contains('Releases for Project One').should('be.visible');
    cy.contains('1.2.0').should('be.visible');
    cy.contains('v1.2.0').should('be.visible');
    cy.contains('Release 1.2.0').should('be.visible');
    cy.contains('Queue monitoring shipped').should('be.visible');
  });
});
