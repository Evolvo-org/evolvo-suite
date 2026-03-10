import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InterventionsService } from './interventions.service.js';

describe('InterventionsService visibility', () => {
  let prisma: {
    humanInterventionCase: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };
  let service: InterventionsService;

  beforeEach(() => {
    prisma = {
      humanInterventionCase: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'case-1',
            projectId: 'project-1',
            workItemId: 'work-1',
            status: 'OPEN',
            summary: 'Repeated runtime failures blocked automation.',
            reason: 'Runtime retries exceeded.',
            attemptsMade: 'runtime failures: 4/3.',
            evidence: 'Runtime command failed repeatedly.',
            suggestedAction: 'Repair the environment and retry.',
            resolutionNotes: null,
            retryCount: 1,
            createdAt: new Date('2026-03-10T08:00:00.000Z'),
            resolvedAt: null,
            updatedAt: new Date('2026-03-10T08:00:00.000Z'),
            workItem: {
              title: 'Fix build pipeline',
            },
          },
          {
            id: 'case-2',
            projectId: 'project-1',
            workItemId: 'work-2',
            status: 'RESOLVED',
            summary: 'Missing configuration blocked automation.',
            reason: 'Missing secret PROD_TOKEN.',
            attemptsMade: null,
            evidence: 'Secret lookup failed.',
            suggestedAction: 'Restore the secret.',
            resolutionNotes: 'Secret restored.',
            retryCount: 0,
            createdAt: new Date('2026-03-09T08:00:00.000Z'),
            resolvedAt: new Date('2026-03-09T09:00:00.000Z'),
            updatedAt: new Date('2026-03-09T09:00:00.000Z'),
            workItem: {
              title: 'Publish release',
            },
          },
        ]),
      },
    };

    service = new InterventionsService(
      prisma as never,
      { ensureProjectExists: vi.fn() } as never,
      { assertTransition: vi.fn() } as never,
    );
  });

  it('lists intervention cases with open items visible first for dashboards', async () => {
    const result = await service.list('project-1');

    expect(prisma.humanInterventionCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 'project-1' },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      }),
    );
    expect(result.items[0]).toMatchObject({
      id: 'case-1',
      status: 'open',
      workItemTitle: 'Fix build pipeline',
    });
    expect(result.items[1]).toMatchObject({
      id: 'case-2',
      status: 'resolved',
      workItemTitle: 'Publish release',
    });
  });
});