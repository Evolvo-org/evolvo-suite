import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const { useQueriesMock } = vi.hoisted(() => ({
  useQueriesMock: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueries: useQueriesMock,
  useQuery: () => ({
    data: {
      items: [
        {
          activePlanVersionNumber: 2,
          createdAt: '2026-03-01T00:00:00.000Z',
          id: 'project-1',
          lifecycleStatus: 'active',
          name: 'Control plane',
          productSpecVersion: 3,
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
      ],
    },
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

import { DashboardPanel } from './dashboard-panel';

describe('DashboardPanel', () => {
  it('renders the dashboard summary cards', () => {
    useQueriesMock
      .mockReturnValueOnce([
        {
          data: {
            generatedAt: '2026-03-10T10:00:00.000Z',
            items: [],
            projectId: 'project-1',
          },
          isError: false,
          isLoading: false,
          refetch: vi.fn(),
        },
      ])
      .mockReturnValueOnce([
        {
          data: {
            items: [],
            projectId: 'project-1',
          },
          isError: false,
          isLoading: false,
          refetch: vi.fn(),
        },
      ])
      .mockReturnValueOnce([
        {
          data: {
            byAgent: [],
            byProviderModel: [],
            estimatedCostUsd: 0,
            from: '2026-03-04',
            inputTokens: 0,
            outputTokens: 0,
            projectId: 'project-1',
            to: '2026-03-10',
            totalEvents: 0,
            totalTokens: 0,
          },
          isError: false,
          isLoading: false,
          refetch: vi.fn(),
        },
      ]);

    const markup = renderToStaticMarkup(
      <DashboardPanel
        usageFilters={{
          from: '2026-03-04',
          to: '2026-03-10',
        }}
      />,
    );

    expect(markup).toContain('Dashboard');
    expect(markup).toContain('Runtime health');
    expect(markup).toContain('Interventions');
    expect(markup).toContain('Usage snapshot');
    expect(markup).toContain('Control plane');
  });
});
