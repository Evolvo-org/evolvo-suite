import { describe, expect, it } from 'vitest';

import { WorkflowStateMachineService } from './workflow-state-machine.service.js';

describe('WorkflowStateMachineService', () => {
  const service = new WorkflowStateMachineService();

  it('allows documented base transitions', () => {
    expect(() =>
      service.assertTransition('inbox', {
        toState: 'planning',
      }),
    ).not.toThrow();

    expect(() =>
      service.assertTransition('inReview', {
        toState: 'readyForRelease',
      }),
    ).not.toThrow();
  });

  it('rejects invalid transitions without override', () => {
    expect(() =>
      service.assertTransition('inbox', {
        toState: 'released',
      }),
    ).toThrow('Invalid workflow transition.');
  });

  it('requires a reason for human intervention', () => {
    expect(() =>
      service.assertTransition('inDev', {
        toState: 'requiresHumanIntervention',
      }),
    ).toThrow('Transition reason required.');
  });

  it('allows operator override transitions when a reason is provided', () => {
    expect(() =>
      service.assertTransition('requiresHumanIntervention', {
        toState: 'planning',
        operatorOverride: true,
        reason: 'Operator resumed work after manual investigation.',
      }),
    ).not.toThrow();
  });

  it('requires a reason for operator override transitions', () => {
    expect(() =>
      service.assertTransition('readyForRelease', {
        toState: 'inReview',
        operatorOverride: true,
      }),
    ).toThrow('Transition reason required.');
  });
});
