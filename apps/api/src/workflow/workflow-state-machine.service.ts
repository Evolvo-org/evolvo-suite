import { BadRequestException, Injectable } from '@nestjs/common';
import type { TransitionWorkItemRequest, WorkItemState } from '@repo/shared';

const baseTransitions: Record<WorkItemState, WorkItemState[]> = {
  inbox: ['planning'],
  planning: ['readyForDev', 'requiresHumanIntervention'],
  readyForDev: ['inDev'],
  inDev: ['readyForReview', 'requiresHumanIntervention'],
  readyForReview: ['inReview'],
  inReview: ['readyForDev', 'readyForRelease', 'requiresHumanIntervention'],
  readyForRelease: ['released', 'requiresHumanIntervention'],
  requiresHumanIntervention: [],
  released: [],
};

const operatorOverrideTransitions: Record<WorkItemState, WorkItemState[]> = {
  inbox: [],
  planning: ['inbox'],
  readyForDev: ['planning'],
  inDev: ['readyForDev'],
  readyForReview: ['inDev'],
  inReview: ['readyForReview'],
  readyForRelease: ['inReview'],
  requiresHumanIntervention: ['planning', 'readyForDev'],
  released: [],
};

@Injectable()
export class WorkflowStateMachineService {
  public getAllowedTransitions(
    fromState: WorkItemState,
    operatorOverride = false,
  ): WorkItemState[] {
    const base = baseTransitions[fromState] ?? [];

    if (!operatorOverride) {
      return base;
    }

    return [...new Set([...base, ...(operatorOverrideTransitions[fromState] ?? [])])];
  }

  public assertTransition(
    fromState: WorkItemState,
    payload: TransitionWorkItemRequest,
  ): void {
    const toState = payload.toState;
    const operatorOverride = payload.operatorOverride === true;
    const allowedTransitions = this.getAllowedTransitions(
      fromState,
      operatorOverride,
    );

    if (!allowedTransitions.includes(toState)) {
      throw new BadRequestException({
        message: 'Invalid workflow transition.',
        errors: [
          `Cannot move a work item from ${fromState} to ${toState}${
            operatorOverride ? ' even with operator override.' : '.'
          }`,
        ],
      });
    }

    if (toState === 'requiresHumanIntervention' && !payload.reason?.trim()) {
      throw new BadRequestException({
        message: 'Transition reason required.',
        errors: [
          'A reason is required when moving a work item to requiresHumanIntervention.',
        ],
      });
    }

    if (operatorOverride && !payload.reason?.trim()) {
      throw new BadRequestException({
        message: 'Transition reason required.',
        errors: ['A reason is required when using an operator override transition.'],
      });
    }
  }
}
