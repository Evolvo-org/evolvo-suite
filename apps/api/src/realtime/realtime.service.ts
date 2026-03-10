import { Inject, Injectable } from '@nestjs/common';
import type { ProjectRealtimeEvent, RealtimeEventName } from '@repo/shared';
import { realtimeQueryInvalidationMap } from '@repo/shared';

import { RealtimeGateway } from './realtime.gateway.js';

@Injectable()
export class RealtimeService {
  public constructor(
    @Inject(RealtimeGateway)
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  public publishProjectEvent(params: {
    name: RealtimeEventName;
    projectId: string;
    entityId?: string;
    workItemId?: string;
    payload?: Record<string, unknown>;
  }): ProjectRealtimeEvent {
    const event: ProjectRealtimeEvent = {
      name: params.name,
      projectId: params.projectId,
      entityId: params.entityId,
      workItemId: params.workItemId,
      occurredAt: new Date().toISOString(),
      invalidationKeys: realtimeQueryInvalidationMap[params.name],
      payload: params.payload,
    };

    this.realtimeGateway.broadcastProjectEvent(event);
    return event;
  }
}
