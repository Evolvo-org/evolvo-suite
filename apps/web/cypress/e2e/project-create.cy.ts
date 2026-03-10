/// <reference types="cypress" />

describe('Project create flow', () => {
  it('creates a project and redirects to the overview', () => {
    cy.intercept('GET', '**/api/v1/settings/queue-limits/defaults', {
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
      updatedAt: '2026-03-10T09:00:00.000Z',
    });

    cy.intercept('POST', '**/api/v1/projects', (request) => {
      expect(request.body).to.include({
        name: 'Project Two',
      });
      expect(request.body.repository).to.include({
        owner: 'acme',
        name: 'project-two',
      });

      request.reply({
        success: true,
        message: 'Project created successfully.',
        data: {
          id: 'project-2',
          name: 'Project Two',
          slug: 'project-two',
          lifecycleStatus: 'active',
          repository: {
            provider: 'github',
            owner: 'acme',
            name: 'project-two',
            url: 'https://github.com/acme/project-two',
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
          productSpecVersion: 1,
          activePlanVersionNumber: null,
          metrics: {
            kanbanCounts: {
              inbox: 0,
              planning: 0,
              readyForDev: 0,
              inDev: 0,
              readyForReview: 0,
              inReview: 0,
              readyForRelease: 0,
              requiresHumanIntervention: 0,
              released: 0,
            },
            runtimeStatus: 'pending',
            latestActivity: [],
          },
          createdAt: '2026-03-10T09:05:00.000Z',
          updatedAt: '2026-03-10T09:05:00.000Z',
        },
      });
    });

    cy.intercept('GET', '**/api/v1/projects/project-2', {
      id: 'project-2',
      name: 'Project Two',
      slug: 'project-two',
      lifecycleStatus: 'active',
      repository: {
        provider: 'github',
        owner: 'acme',
        name: 'project-two',
        url: 'https://github.com/acme/project-two',
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
      productSpecVersion: 1,
      activePlanVersionNumber: null,
      metrics: {
        kanbanCounts: {
          inbox: 0,
          planning: 0,
          readyForDev: 0,
          inDev: 0,
          readyForReview: 0,
          inReview: 0,
          readyForRelease: 0,
          requiresHumanIntervention: 0,
          released: 0,
        },
        runtimeStatus: 'pending',
        latestActivity: [],
      },
      createdAt: '2026-03-10T09:05:00.000Z',
      updatedAt: '2026-03-10T09:05:00.000Z',
    });
    cy.intercept('GET', '**/api/v1/projects/project-2/runtime-dashboard', {
      projectId: 'project-2',
      generatedAt: '2026-03-10T09:05:00.000Z',
      items: [],
    });
    cy.intercept('GET', '**/api/v1/projects/project-2/releases', {
      projectId: 'project-2',
      items: [],
    });
    cy.intercept('GET', '**/api/v1/projects/project-2/interventions', {
      projectId: 'project-2',
      items: [],
    });
    cy.intercept('GET', '**/api/v1/projects/project-2/product-spec', {
      projectId: 'project-2',
      content: 'Build a dashboard for autonomous delivery.',
      version: 1,
      updatedAt: '2026-03-10T09:05:00.000Z',
    });
    cy.intercept('GET', '**/api/v1/projects/project-2/development-plan', {
      planId: null,
      activeVersionId: null,
      title: 'Project Two development plan',
      activeContent: '',
      versions: [],
    });
    cy.intercept('GET', '**/api/v1/projects/project-2/development-plan/versions', {
      planId: null,
      versions: [],
    });

    cy.visit('/projects/new');

    cy.get('#project-name').type('Project Two');
    cy.get('#repository-owner').type('acme');
    cy.get('#repository-name').type('project-two');
    cy.get('#product-description').type(
      'Build a dashboard for autonomous delivery.',
    );
    cy.contains('button', 'Create project').click();

    cy.location('pathname').should('eq', '/projects/project-2');
    cy.contains('Project Two').should('be.visible');
    cy.contains('Runtime status: pending').should('be.visible');
  });
});
