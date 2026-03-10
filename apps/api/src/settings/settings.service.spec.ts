import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defaultAgentRoutingConfig,
  defaultProjectQueueLimits,
} from '@repo/shared';

import { SettingsService } from './settings.service.js';

describe('SettingsService', () => {
  let prisma: {
    systemAgentRouting: {
      findUnique: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
    };
    systemQueueLimits: {
      findUnique: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
    };
  };
  let service: SettingsService;

  beforeEach(() => {
    prisma = {
      systemAgentRouting: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      systemQueueLimits: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
    };

    service = new SettingsService(prisma as never);
  });

  it('returns default queue limits when no persisted settings exist', async () => {
    prisma.systemQueueLimits.findUnique.mockResolvedValue(null);
    prisma.systemAgentRouting.findUnique.mockResolvedValue(null);

    await expect(service.getResolvedSystemQueueLimits()).resolves.toEqual(
      defaultProjectQueueLimits,
    );

    await expect(service.getSystemQueueLimits()).resolves.toEqual({
      queueLimits: defaultProjectQueueLimits,
      updatedAt: null,
    });

    await expect(service.getSystemAgentRouting()).resolves.toEqual({
      routing: defaultAgentRoutingConfig,
      updatedAt: null,
    });
  });

  it('persists and returns updated queue limits', async () => {
    const updatedAt = new Date('2026-03-09T12:30:00.000Z');
    prisma.systemQueueLimits.upsert.mockResolvedValue({
      id: 'system-defaults',
      ...defaultProjectQueueLimits,
      maxInDev: 7,
      updatedAt,
    });

    const response = await service.updateSystemQueueLimits({
      ...defaultProjectQueueLimits,
      maxInDev: 7,
    });

    expect(response.queueLimits.maxInDev).toBe(7);
    expect(response.updatedAt).toBe(updatedAt.toISOString());
    expect(prisma.systemQueueLimits.upsert).toHaveBeenCalledOnce();
  });

  it('persists and returns updated system agent routing', async () => {
    const updatedAt = new Date('2026-03-09T12:45:00.000Z');
    prisma.systemAgentRouting.upsert.mockResolvedValue({
      id: 'system-agent-routing-defaults',
      defaultProvider: 'codex',
      defaultModel: 'codex-mini-latest',
      agentRoutesJson: {
        dev: {
          provider: 'openai',
          model: 'gpt-5.4',
        },
      },
      updatedAt,
    });

    const response = await service.updateSystemAgentRouting({
      defaultProvider: 'codex',
      defaultModel: 'codex-mini-latest',
      agentRoutes: {
        dev: {
          provider: 'openai',
          model: 'gpt-5.4',
        },
      },
    });

    expect(response.routing.defaultProvider).toBe('codex');
    expect(response.routing.agentRoutes.dev?.model).toBe('gpt-5.4');
    expect(response.updatedAt).toBe(updatedAt.toISOString());
    expect(prisma.systemAgentRouting.upsert).toHaveBeenCalledOnce();
  });
});