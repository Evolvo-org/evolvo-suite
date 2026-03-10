import { describe, expect, it, vi } from 'vitest';

import { RecoveryService } from './recovery-service';

describe('RecoveryService', () => {
  it('marks stale worktrees during restart reconciliation', async () => {
    const runtimeApiClient = {
      listProjectWorktrees: vi.fn().mockResolvedValue({
        projectId: 'project-1',
        items: [
          {
            id: 'worktree-1',
            path: '/tmp/missing-worktree',
            status: 'active',
          },
        ],
      }),
      markWorktreeStale: vi.fn().mockResolvedValue(undefined),
    };

    const service = new RecoveryService(
      '/tmp/runtime-root',
      {
        listProjects: vi.fn().mockResolvedValue([
          {
            projectId: 'project-1',
            localPath: '/tmp/project-1',
          },
        ]),
      } as never,
      runtimeApiClient as never,
      {
        isStale: vi.fn().mockResolvedValue(true),
      } as never,
    );

    const result = await service.reconcileOnStartup();

    expect(result.reconciledProjects).toBe(1);
    expect(result.staleMarked).toBe(1);
    expect(runtimeApiClient.markWorktreeStale).toHaveBeenCalledOnce();
  });
});