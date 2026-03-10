import { describe, expect, it } from 'vitest';

import {
  buildDashboardMetrics,
  createDashboardUsageFilters,
  getDashboardUsageRangeLabel,
} from './dashboard-metrics';

describe('dashboard-metrics', () => {
  it('creates a stable seven-day usage window', () => {
    const filters = createDashboardUsageFilters(new Date('2026-03-10T12:00:00.000Z'));

    expect(filters).toEqual({
      from: '2026-03-04',
      to: '2026-03-10',
    });
    expect(getDashboardUsageRangeLabel(filters)).toBe(
      '2026-03-04 to 2026-03-10',
    );
  });

  it('aggregates project, runtime, intervention, and usage metrics', () => {
    const metrics = buildDashboardMetrics({
      interventionLists: [
        {
          items: [
            {
              attemptsMade: null,
              createdAt: '2026-03-07T09:00:00.000Z',
              evidence: null,
              id: 'int-1',
              projectId: 'project-1',
              reason: 'Retry threshold exceeded',
              resolutionNotes: null,
              resolvedAt: null,
              retryCount: 3,
              status: 'open',
              suggestedAction: null,
              summary: 'Runtime retries exceeded',
              updatedAt: '2026-03-07T09:00:00.000Z',
              workItemId: 'work-1',
              workItemTitle: 'Fix auth bootstrap',
            },
            {
              attemptsMade: null,
              createdAt: '2026-03-08T09:00:00.000Z',
              evidence: null,
              id: 'int-2',
              projectId: 'project-2',
              reason: 'Resolved',
              resolutionNotes: 'Handled',
              resolvedAt: '2026-03-08T11:00:00.000Z',
              retryCount: 1,
              status: 'resolved',
              suggestedAction: null,
              summary: 'Merge conflict resolved',
              updatedAt: '2026-03-08T11:00:00.000Z',
              workItemId: 'work-2',
              workItemTitle: 'Release cut',
            },
          ],
          projectId: 'project-1',
        },
      ],
      projects: [
        {
          activePlanVersionNumber: 1,
          createdAt: '2026-03-01T00:00:00.000Z',
          id: 'project-1',
          lifecycleStatus: 'active',
          name: 'Control plane',
          productSpecVersion: 2,
          repository: {
            baseBranch: 'main',
            defaultBranch: 'main',
            name: 'control-plane',
            owner: 'acme',
            provider: 'github',
            url: 'https://github.com/acme/control-plane',
          },
          runtimeStatus: 'online',
          slug: 'control-plane',
          updatedAt: '2026-03-09T00:00:00.000Z',
        },
        {
          activePlanVersionNumber: null,
          createdAt: '2026-03-02T00:00:00.000Z',
          id: 'project-2',
          lifecycleStatus: 'paused',
          name: 'Billing portal',
          productSpecVersion: 1,
          repository: {
            baseBranch: 'main',
            defaultBranch: 'main',
            name: 'billing-portal',
            owner: 'acme',
            provider: 'github',
            url: 'https://github.com/acme/billing-portal',
          },
          runtimeStatus: 'offline',
          slug: 'billing-portal',
          updatedAt: '2026-03-09T00:00:00.000Z',
        },
      ],
      runtimeDashboards: [
        {
          generatedAt: '2026-03-10T10:00:00.000Z',
          items: [
            {
              activeJobSummary: 'Processing auth work',
              activeJobs: 2,
              capabilities: ['dev'],
              connectionStatus: 'online',
              displayName: 'Runtime A',
              heartbeatAgeSeconds: 12,
              lastAction: 'Applied patch',
              lastError: null,
              lastSeenAt: '2026-03-10T09:59:48.000Z',
              recentFailures: [],
              reportedStatus: 'busy',
              runtimeId: 'runtime-a',
            },
          ],
          projectId: 'project-1',
        },
        {
          generatedAt: '2026-03-10T10:00:00.000Z',
          items: [
            {
              activeJobSummary: null,
              activeJobs: 0,
              capabilities: ['release'],
              connectionStatus: 'offline',
              displayName: 'Runtime B',
              heartbeatAgeSeconds: 600,
              lastAction: null,
              lastError: 'Lost heartbeat',
              lastSeenAt: '2026-03-10T09:50:00.000Z',
              recentFailures: [],
              reportedStatus: 'degraded',
              runtimeId: 'runtime-b',
            },
          ],
          projectId: 'project-2',
        },
      ],
      usageSummaries: [
        {
          byAgent: [],
          byProviderModel: [
            {
              estimatedCostUsd: 12.5,
              inputTokens: 100,
              key: 'openai:gpt-5',
              outputTokens: 200,
              totalEvents: 4,
              totalTokens: 300,
            },
          ],
          estimatedCostUsd: 12.5,
          from: '2026-03-04',
          inputTokens: 100,
          outputTokens: 200,
          projectId: 'project-1',
          to: '2026-03-10',
          totalEvents: 4,
          totalTokens: 300,
        },
        {
          byAgent: [],
          byProviderModel: [
            {
              estimatedCostUsd: 3.25,
              inputTokens: 25,
              key: 'openai:gpt-4.1-mini',
              outputTokens: 40,
              totalEvents: 2,
              totalTokens: 65,
            },
          ],
          estimatedCostUsd: 3.25,
          from: '2026-03-04',
          inputTokens: 25,
          outputTokens: 40,
          projectId: 'project-2',
          to: '2026-03-10',
          totalEvents: 2,
          totalTokens: 65,
        },
      ],
    });

    expect(metrics.projects).toEqual({
      active: 1,
      draft: 0,
      paused: 1,
      runtimeAlertProjects: 1,
      total: 2,
    });
    expect(metrics.runtime).toEqual({
      activeJobs: 2,
      busiestProjectName: 'Control plane',
      degradedRuntimes: 1,
      offlineRuntimes: 1,
      onlineRuntimes: 1,
      totalRuntimes: 2,
    });
    expect(metrics.interventions).toEqual({
      affectedProjects: 1,
      oldestOpenSummary: 'Runtime retries exceeded',
      openCases: 1,
      resolvedCases: 1,
    });
    expect(metrics.usage).toEqual({
      topProjectCostUsd: 12.5,
      topProjectName: 'Control plane',
      topProviderModel: 'openai:gpt-5',
      totalCostUsd: 15.75,
      totalEvents: 6,
      totalTokens: 365,
    });
  });
});
