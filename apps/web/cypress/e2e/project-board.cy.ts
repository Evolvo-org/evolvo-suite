/// <reference types="cypress" />

const projectFixture = {
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
      readyForDev: 1,
      inDev: 0,
      readyForReview: 0,
      inReview: 0,
      readyForRelease: 0,
      requiresHumanIntervention: 0,
      released: 0,
    },
    runtimeStatus: 'online',
    latestActivity: [],
  },
  createdAt: '2026-03-10T09:00:00.000Z',
  updatedAt: '2026-03-10T09:15:00.000Z',
};

const buildBoardResponse = (planningState: 'planning' | 'readyForDev') => ({
  projectId: 'project-1',
  counts: {
    inbox: 1,
    planning: planningState === 'planning' ? 1 : 0,
    readyForDev: planningState === 'readyForDev' ? 2 : 1,
    inDev: 0,
    readyForReview: 0,
    inReview: 0,
    readyForRelease: 0,
    requiresHumanIntervention: 0,
    released: 0,
  },
  columns: [
    {
      state: 'inbox',
      label: 'Inbox',
      items: [],
    },
    {
      state: 'planning',
      label: 'Planning',
      items:
        planningState === 'planning'
          ? [
              {
                id: 'work-1',
                state: 'planning',
                kind: 'task',
                title: 'Implement realtime sync',
                description: 'Wire dashboard invalidation to realtime events.',
                epicTitle: 'Operator workflows',
                priority: 'high',
                dependencyIds: [],
                acceptanceCriteriaCount: 3,
                completedAcceptanceCriteriaCount: 1,
              },
            ]
          : [],
    },
    {
      state: 'readyForDev',
      label: 'Ready for dev',
      items: [
        {
          id: 'work-2',
          state: 'readyForDev',
          kind: 'task',
          title: 'Ship runtime monitor',
          description: 'Expose runtime health and logs in the dashboard.',
          epicTitle: 'Operator workflows',
          priority: 'medium',
          dependencyIds: [],
          acceptanceCriteriaCount: 2,
          completedAcceptanceCriteriaCount: 2,
        },
        ...(planningState === 'readyForDev'
          ? [
              {
                id: 'work-1',
                state: 'readyForDev',
                kind: 'task',
                title: 'Implement realtime sync',
                description: 'Wire dashboard invalidation to realtime events.',
                epicTitle: 'Operator workflows',
                priority: 'high',
                dependencyIds: [],
                acceptanceCriteriaCount: 3,
                completedAcceptanceCriteriaCount: 1,
              },
            ]
          : []),
      ],
    },
    {
      state: 'inDev',
      label: 'In dev',
      items: [],
    },
    {
      state: 'readyForReview',
      label: 'Ready for review',
      items: [],
    },
  ],
});

describe('Project board', () => {
  it('renders board columns and work items', () => {
    cy.intercept('GET', '**/api/v1/projects/project-1', projectFixture);
    cy.intercept('GET', '**/api/v1/projects/project-1/board', buildBoardResponse('planning'));

    cy.visit('/projects/project-1/board');

    cy.contains('Kanban board for Project One').should('be.visible');
    cy.contains('Implement realtime sync').should('be.visible');
    cy.contains('Ship runtime monitor').should('be.visible');
    cy.contains('Board summary').should('be.visible');
  });

  it('moves a work item between columns with drag and drop', () => {
    cy.intercept('GET', '**/api/v1/projects/project-1', projectFixture);
    cy.intercept('GET', '**/api/v1/projects/project-1/board', buildBoardResponse('planning'));
    cy.intercept('POST', '**/api/v1/projects/project-1/work-items/work-1/transition', {
      success: true,
      message: 'Work item transitioned successfully.',
      data: buildBoardResponse('readyForDev'),
    });

    cy.visit('/projects/project-1/board');

    cy.contains('article', 'Implement realtime sync').trigger('dragstart');
    cy.contains('section', 'Ready for dev').trigger('dragover');
    cy.contains('section', 'Ready for dev').trigger('drop');

    cy.contains('section', 'Ready for dev').should(
      'contain.text',
      'Implement realtime sync',
    );
    cy.contains('section', 'Planning').should(
      'not.contain.text',
      'Implement realtime sync',
    );
  });
});
