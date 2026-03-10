import type { ProjectRealtimeEvent, RealtimeEventName } from '@repo/shared';
import { realtimeQueryInvalidationMap } from '@repo/shared';

const projectEventExtraTargets: Record<RealtimeEventName, string[]> = {
  'project.planning.updated': ['detail', 'list'],
  'project.workflow.updated': ['detail', 'list'],
  'project.worktree.updated': ['detail', 'list'],
  'project.agent-run.updated': ['detail'],
  'project.review-gate.updated': ['detail'],
  'project.release.updated': ['detail', 'list'],
  'project.intervention.updated': ['detail', 'list'],
  'project.usage.updated': ['detail', 'user-usage-summary'],
};

const queryKeyIncludes = (
  queryKey: readonly unknown[],
  target: string,
): boolean => {
  return queryKey.some((value) => value === target);
};

const matchesProjectDetailQuery = (
  queryKey: readonly unknown[],
  projectId: string,
): boolean => {
  return (
    queryKey[0] === 'projects' &&
    queryKey[1] === 'detail' &&
    queryKey[2] === projectId
  );
};

const matchesProjectListQuery = (queryKey: readonly unknown[]): boolean => {
  return queryKey[0] === 'projects' && queryKey[1] === 'list';
};

const matchesProjectScopedQuery = (
  queryKey: readonly unknown[],
  projectId: string,
  target: string,
): boolean => {
  return queryKeyIncludes(queryKey, projectId) && queryKeyIncludes(queryKey, target);
};

const matchesWorkItemDetailQuery = (
  queryKey: readonly unknown[],
  event: ProjectRealtimeEvent,
): boolean => {
  if (event.workItemId) {
    return (
      queryKey[0] === 'projects' &&
      queryKey[1] === event.projectId &&
      queryKey[2] === 'work-item-detail' &&
      queryKey[3] === event.workItemId
    );
  }

  return matchesProjectScopedQuery(queryKey, event.projectId, 'work-item-detail');
};

export const getProjectIdFromPathname = (pathname: string): string | null => {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
};

export const getRealtimeServerUrl = (): string | null => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (apiBaseUrl) {
    return new URL(apiBaseUrl).origin;
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return null;
};

export const shouldInvalidateRealtimeQuery = (
  queryKey: readonly unknown[],
  event: ProjectRealtimeEvent,
): boolean => {
  const configuredTargets = realtimeQueryInvalidationMap[event.name];
  const targets = [...configuredTargets, ...projectEventExtraTargets[event.name]];

  for (const target of targets) {
    switch (target) {
      case 'detail': {
        if (matchesProjectDetailQuery(queryKey, event.projectId)) {
          return true;
        }
        break;
      }
      case 'list': {
        if (matchesProjectListQuery(queryKey)) {
          return true;
        }
        break;
      }
      case 'work-item-detail': {
        if (matchesWorkItemDetailQuery(queryKey, event)) {
          return true;
        }
        break;
      }
      case 'user-usage-summary': {
        if (queryKey[0] === 'usage' && queryKey[1] === 'users') {
          return true;
        }
        break;
      }
      default: {
        if (matchesProjectScopedQuery(queryKey, event.projectId, target)) {
          return true;
        }
      }
    }
  }

  return false;
};
