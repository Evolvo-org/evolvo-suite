/// <reference types="cypress" />

describe('Project usage analytics', () => {
  it('renders project and user usage with date range filters', () => {
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

    cy.intercept('GET', '**/api/v1/auth/current-user', {
      userId: 'user-1',
      email: 'operator@example.com',
      displayName: 'Alex Operator',
      role: 'operator',
      workspaceKey: 'default',
      capabilities: ['projects:write', 'workflow:write', 'usage:read'],
      sessionExpiresAt: '2026-03-10T18:00:00.000Z',
      adminBypassActive: false,
    });

    cy.intercept('GET', '**/api/v1/projects/project-1/usage/summary', {
      projectId: 'project-1',
      from: null,
      to: null,
      totalEvents: 7,
      inputTokens: 4800,
      outputTokens: 2200,
      totalTokens: 7000,
      estimatedCostUsd: 0.164,
      byAgent: [
        {
          key: 'planning',
          totalEvents: 3,
          inputTokens: 1800,
          outputTokens: 900,
          totalTokens: 2700,
          estimatedCostUsd: 0.061,
        },
        {
          key: 'dev',
          totalEvents: 2,
          inputTokens: 1400,
          outputTokens: 900,
          totalTokens: 2300,
          estimatedCostUsd: 0.058,
        },
        {
          key: 'review',
          totalEvents: 2,
          inputTokens: 1600,
          outputTokens: 400,
          totalTokens: 2000,
          estimatedCostUsd: 0.045,
        },
      ],
      byProviderModel: [
        {
          key: 'openai:gpt-5.4',
          totalEvents: 4,
          inputTokens: 2600,
          outputTokens: 1300,
          totalTokens: 3900,
          estimatedCostUsd: 0.109,
        },
        {
          key: 'anthropic:claude-sonnet-4',
          totalEvents: 3,
          inputTokens: 2200,
          outputTokens: 900,
          totalTokens: 3100,
          estimatedCostUsd: 0.055,
        },
      ],
    });

    cy.intercept('GET', '**/api/v1/projects/project-1/usage/summary?from=2026-03-01&to=2026-03-10', {
      projectId: 'project-1',
      from: '2026-03-01T00:00:00.000Z',
      to: '2026-03-10T00:00:00.000Z',
      totalEvents: 4,
      inputTokens: 3000,
      outputTokens: 1200,
      totalTokens: 4200,
      estimatedCostUsd: 0.094,
      byAgent: [
        {
          key: 'planning',
          totalEvents: 2,
          inputTokens: 1200,
          outputTokens: 500,
          totalTokens: 1700,
          estimatedCostUsd: 0.038,
        },
        {
          key: 'dev',
          totalEvents: 2,
          inputTokens: 1800,
          outputTokens: 700,
          totalTokens: 2500,
          estimatedCostUsd: 0.056,
        },
      ],
      byProviderModel: [
        {
          key: 'openai:gpt-5.4',
          totalEvents: 4,
          inputTokens: 3000,
          outputTokens: 1200,
          totalTokens: 4200,
          estimatedCostUsd: 0.094,
        },
      ],
    });

    cy.intercept('GET', '**/api/v1/usage/users/user-1/summary', {
      userId: 'user-1',
      from: null,
      to: null,
      totalEvents: 2,
      inputTokens: 900,
      outputTokens: 500,
      totalTokens: 1400,
      estimatedCostUsd: 0.031,
      byAgent: [
        {
          key: 'planning',
          totalEvents: 1,
          inputTokens: 400,
          outputTokens: 200,
          totalTokens: 600,
          estimatedCostUsd: 0.012,
        },
        {
          key: 'review',
          totalEvents: 1,
          inputTokens: 500,
          outputTokens: 300,
          totalTokens: 800,
          estimatedCostUsd: 0.019,
        },
      ],
      byProviderModel: [],
    });

    cy.intercept('GET', '**/api/v1/usage/users/user-1/summary?from=2026-03-01&to=2026-03-10', {
      userId: 'user-1',
      from: '2026-03-01T00:00:00.000Z',
      to: '2026-03-10T00:00:00.000Z',
      totalEvents: 1,
      inputTokens: 500,
      outputTokens: 200,
      totalTokens: 700,
      estimatedCostUsd: 0.014,
      byAgent: [
        {
          key: 'review',
          totalEvents: 1,
          inputTokens: 500,
          outputTokens: 200,
          totalTokens: 700,
          estimatedCostUsd: 0.014,
        },
      ],
      byProviderModel: [],
    });

    cy.visit('/projects/project-1/usage');

    cy.contains('Usage analytics for Project One').should('be.visible');
    cy.contains('7,000').should('be.visible');
    cy.contains('Alex Operator').should('be.visible');
    cy.contains('Openai Gpt 5.4').should('be.visible');

    cy.get('#usage-from-date').type('2026-03-01');
    cy.get('#usage-to-date').type('2026-03-10');
    cy.get('[data-cy="usage-apply-range"]').click();

    cy.contains('4,200').should('be.visible');
    cy.contains('2026-03-01 to 2026-03-10').should('be.visible');
    cy.contains('0.0940').should('be.visible');
  });
});
