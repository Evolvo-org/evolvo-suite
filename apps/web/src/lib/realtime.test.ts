import type { ProjectRealtimeEvent } from '@repo/shared';
import { describe, expect, it } from 'vitest';

import {
  getProjectIdFromPathname,
  shouldInvalidateRealtimeQuery,
} from './realtime';

const baseEvent: ProjectRealtimeEvent = {
  name: 'project.intervention.updated',
  projectId: 'project-1',
  occurredAt: '2026-03-10T09:15:00.000Z',
  invalidationKeys: ['interventions', 'work-item-detail'],
  workItemId: 'work-1',
};

describe('getProjectIdFromPathname', () => {
  it('returns the active project id from a project route', () => {
    expect(getProjectIdFromPathname('/projects/project-1/runtime')).toBe(
      'project-1',
    );
  });

  it('returns null for non-project routes', () => {
    expect(getProjectIdFromPathname('/settings')).toBeNull();
  });
});

describe('shouldInvalidateRealtimeQuery', () => {
  it('invalidates project detail and list queries for intervention events', () => {
    expect(
      shouldInvalidateRealtimeQuery(
        ['projects', 'detail', 'project-1'],
        baseEvent,
      ),
    ).toBe(true);
    expect(
      shouldInvalidateRealtimeQuery(['projects', 'list', {}], baseEvent),
    ).toBe(true);
  });

  it('invalidates work item detail queries when a work item id is present', () => {
    expect(
      shouldInvalidateRealtimeQuery(
        ['projects', 'project-1', 'work-item-detail', 'work-1'],
        baseEvent,
      ),
    ).toBe(true);
  });

  it('does not invalidate unrelated project queries', () => {
    expect(
      shouldInvalidateRealtimeQuery(
        ['projects', 'detail', 'project-2'],
        baseEvent,
      ),
    ).toBe(false);
  });
});
