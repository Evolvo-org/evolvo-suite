/// <reference types="cypress" />

describe('Project runtime monitor', () => {
  it('renders runtime health and log activity for a project', () => {
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

    cy.intercept('GET', '**/api/v1/projects/project-1/runtime-dashboard', {
      projectId: 'project-1',
      generatedAt: '2026-03-10T09:15:00.000Z',
      items: [
        {
          runtimeId: 'runtime-1',
          displayName: 'London Runtime',
          connectionStatus: 'online',
          reportedStatus: 'busy',
          capabilities: ['git', 'leases', 'heartbeats'],
          heartbeatAgeSeconds: 12,
          activeJobs: 1,
          activeJobSummary: 'Running lint and tests for work item DEV-42.',
          lastAction: 'Uploaded build artifacts for DEV-42.',
          lastError: null,
          lastSeenAt: '2026-03-10T09:14:48.000Z',
          recentFailures: [],
        },
        {
          runtimeId: 'runtime-2',
          displayName: 'Backup Runtime',
          connectionStatus: 'offline',
          reportedStatus: 'degraded',
          capabilities: ['leases'],
          heartbeatAgeSeconds: 240,
          activeJobs: 0,
          activeJobSummary: null,
          lastAction: 'Lost heartbeat while waiting for work.',
          lastError: 'Heartbeat timeout exceeded offline threshold.',
          lastSeenAt: '2026-03-10T09:11:00.000Z',
          recentFailures: [
            {
              id: 'failure-1',
              workItemId: 'work-1',
              message: 'Lease renewal failed while the runtime was offline.',
              occurredAt: '2026-03-10T09:10:00.000Z',
            },
          ],
        },
      ],
    });

    cy.intercept('GET', '**/api/v1/projects/project-1/logs*', {
      projectId: 'project-1',
      totalCount: 2,
      filters: {
        limit: 25,
      },
      items: [
        {
          id: 'log-1',
          level: 'info',
          source: 'runtime',
          projectId: 'project-1',
          workItemId: 'work-1',
          agentRunId: null,
          runtimeId: 'runtime-1',
          userId: null,
          agentType: 'dev',
          eventType: 'runtime.job.progress',
          message: 'Updated progress to 80% for DEV-42.',
          correlationId: 'corr-1',
          payload: {
            progressPercent: 80,
          },
          occurredAt: '2026-03-10T09:14:50.000Z',
          createdAt: '2026-03-10T09:14:50.000Z',
        },
        {
          id: 'log-2',
          level: 'error',
          source: 'runtime',
          projectId: 'project-1',
          workItemId: 'work-2',
          agentRunId: null,
          runtimeId: 'runtime-2',
          userId: null,
          agentType: 'dev',
          eventType: 'runtime.heartbeat.missed',
          message: 'Heartbeat timeout exceeded offline threshold.',
          correlationId: 'corr-2',
          payload: {
            lastSeenAt: '2026-03-10T09:11:00.000Z',
          },
          occurredAt: '2026-03-10T09:12:30.000Z',
          createdAt: '2026-03-10T09:12:30.000Z',
        },
      ],
    });

    cy.visit('/projects/project-1/runtime');

    cy.contains('Runtime monitor for Project One').should('be.visible');
    cy.get('[data-cy="runtime-offline-warning"]')
      .should('be.visible')
      .and('contain.text', 'Backup Runtime');
    cy.contains('London Runtime').should('be.visible');
    cy.contains('Backup Runtime').should('be.visible');
    cy.contains('Heartbeat timeout exceeded offline threshold.').should(
      'be.visible',
    );
    cy.get('[data-cy="runtime-log-stream"]')
      .should('be.visible')
      .and('contain.text', 'runtime.job.progress')
      .and('contain.text', 'runtime.heartbeat.missed');
  });
});
