import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectsService } from './projects.service.js';

describe('ProjectsService repository validation', () => {
  let service: ProjectsService;

  beforeEach(() => {
    service = new ProjectsService(
      {} as never,
      {
        getResolvedSystemQueueLimits: vi.fn(),
        getResolvedSystemAgentRouting: vi.fn(),
      } as never,
      { writeLog: vi.fn() } as never,
      { enqueueRepoCloneOrSync: vi.fn() } as never,
    );
  });

  it('returns an asynchronous setup warning for valid repository configuration', async () => {
    const result = await service.validateRepositoryConfig({
      provider: 'github',
      owner: 'Evolvo-org',
      name: 'evolvo-suite',
      url: 'https://github.com/Evolvo-org/evolvo-suite.git',
      defaultBranch: 'main',
      baseBranch: 'main',
    });

    expect(result.isValid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.warnings).toContain(
      'Repository setup runs asynchronously after project creation or repository updates.',
    );
    expect(result.normalizedUrl).toBe('https://github.com/Evolvo-org/evolvo-suite');
  });

  it('keeps base branch mismatch as a warning for asynchronous setup', async () => {
    const result = await service.validateRepositoryConfig({
      provider: 'github',
      owner: 'Evolvo-org',
      name: 'evolvo-suite',
      url: 'https://github.com/Evolvo-org/evolvo-suite',
      defaultBranch: 'main',
      baseBranch: 'develop',
    });

    expect(result.isValid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.warnings).toContain(
      'Base branch differs from default branch. Confirm release and merge strategy expectations.',
    );
  });

  it('rejects project creation when repository validation fails', async () => {
    vi.spyOn(service, 'validateRepositoryConfig').mockResolvedValue({
      provider: 'github',
      isValid: false,
      normalizedUrl: 'https://github.com/Evolvo-org/evolvo-suite',
      issues: ['Default branch main was not found on the remote repository.'],
      warnings: [],
      inferredOwner: 'Evolvo-org',
      inferredName: 'evolvo-suite',
    });

    await expect(
      service.createProject({
        name: 'Evolvo Suite',
        productDescription: 'Ship the product.',
        repository: {
          provider: 'github',
          owner: 'Evolvo-org',
          name: 'evolvo-suite',
          url: 'https://github.com/Evolvo-org/evolvo-suite',
          defaultBranch: 'main',
          baseBranch: 'main',
        },
      }),
    ).rejects.toThrow(ConflictException);
  });
});