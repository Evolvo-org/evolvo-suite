/// <reference types="cypress" />

import type { HumanInterventionListResponse } from '@repo/shared';

describe('Project intervention queue', () => {
  it('renders blocked work and retries an intervention case', () => {
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
          requiresHumanIntervention: 1,
          released: 2,
        },
        runtimeStatus: 'degraded',
        latestActivity: [],
      },
      createdAt: '2026-03-10T09:00:00.000Z',
      updatedAt: '2026-03-10T09:15:00.000Z',
    });

    const interventionsResponse: HumanInterventionListResponse = {
      projectId: 'project-1',
      items: [
        {
          id: 'intervention-1',
          projectId: 'project-1',
          workItemId: 'work-1',
          workItemTitle: 'Repair release smoke tests',
          status: 'open',
          summary: 'Repeated review failures blocked automation.',
          reason:
            'Review checks kept failing after three attempts because the smoke environment is missing config.',
          attemptsMade: 'review failures: 3/3.',
          evidence: 'Smoke suite logs show API_KEY missing in the production job.',
          suggestedAction:
            'Restore the missing secret, rerun verification, and retry the work item.',
          resolutionNotes: null,
          retryCount: 0,
          createdAt: '2026-03-10T07:45:00.000Z',
          resolvedAt: null,
          updatedAt: '2026-03-10T07:45:00.000Z',
        },
        {
          id: 'intervention-2',
          projectId: 'project-1',
          workItemId: 'work-2',
          workItemTitle: 'Clarify queue fairness metrics',
          status: 'resolved',
          summary: 'Ambiguous requirements blocked automation.',
          reason: 'The planning context did not specify how to present fairness drift.',
          attemptsMade: 'ambiguity failures: 1/1.',
          evidence: 'Planning prompt requested a dashboard without defining the metric.',
          suggestedAction:
            'Update the planning context with the required fairness metric and retry.',
          resolutionNotes: 'Updated the backlog and sent the work item back to planning.',
          retryCount: 1,
          createdAt: '2026-03-09T10:00:00.000Z',
          resolvedAt: '2026-03-09T10:20:00.000Z',
          updatedAt: '2026-03-09T10:20:00.000Z',
        },
      ],
    };

    cy.intercept('GET', '**/api/v1/projects/project-1/interventions', (request) => {
      request.reply(interventionsResponse);
    });

    cy.intercept(
      'POST',
      '**/api/v1/projects/project-1/interventions/intervention-1/retry',
      (request) => {
        const currentIntervention = interventionsResponse.items[0];

        if (!currentIntervention) {
          throw new Error('Missing intervention fixture for retry.');
        }

        interventionsResponse.items[0] = {
          ...currentIntervention,
          status: 'resolved',
          resolutionNotes:
            'Restored production secrets and approved a retry to ready for dev.',
          retryCount: 1,
          resolvedAt: '2026-03-10T09:20:00.000Z',
          updatedAt: '2026-03-10T09:20:00.000Z',
        };

        request.reply({
          success: true,
          message: 'Human intervention retry handled successfully.',
          data: interventionsResponse.items[0],
        });
      },
    );

    cy.visit('/projects/project-1/interventions');

    cy.contains('Intervention queue for Project One').should('be.visible');
    cy.contains('Repair release smoke tests').should('be.visible');
    cy.get('[data-cy="intervention-detail-panel"]')
      .should('be.visible')
      .and('contain.text', 'Smoke suite logs show API_KEY missing in the production job.')
      .and('contain.text', 'Restore the missing secret, rerun verification, and retry the work item.');

    cy.get('[data-cy="intervention-retry-target"]').select('readyForDev');
    cy.get('[data-cy="intervention-operator-notes"]').type(
      'Restored production secrets and approved a retry to ready for dev.',
    );
    cy.get('[data-cy="intervention-retry-button"]').click();

    cy.contains('Resolved').should('be.visible');
    cy.contains('Restored production secrets and approved a retry to ready for dev.').should(
      'be.visible',
    );
  });
});
