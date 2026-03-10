import { describe, expect, it, vi } from 'vitest';

import { ProjectsService } from './projects.service.js';

describe('ProjectsService deleteProject', () => {
  it('deletes a project and records a deletion log entry', async () => {
    const prisma = {
      project: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'project-1',
          name: 'TaskLite',
        }),
        delete: vi.fn().mockResolvedValue({ id: 'project-1' }),
      },
    };
    const logsService = {
      writeLog: vi.fn().mockResolvedValue(undefined),
    };

    const service = new ProjectsService(
      prisma as never,
      {
        getResolvedSystemQueueLimits: vi.fn(),
        getResolvedSystemAgentRouting: vi.fn(),
      } as never,
      logsService as never,
    );

    const result = await service.deleteProject('project-1');

    expect(prisma.project.delete).toHaveBeenCalledWith({
      where: { id: 'project-1' },
    });
    expect(logsService.writeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'project.deleted',
        projectId: 'project-1',
      }),
    );
    expect(result).toEqual({
      projectId: 'project-1',
      name: 'TaskLite',
    });
  });
});