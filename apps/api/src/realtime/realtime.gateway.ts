import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Inject } from '@nestjs/common';
import type { OnGatewayConnection } from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import type { Server, Socket } from 'socket.io';
import type { ProjectRealtimeEvent } from '@repo/shared';

import type { ApplicationEnvironment } from '../config/environment.js';

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  public constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<ApplicationEnvironment, true>,
  ) {}

  public handleConnection(client: Socket): void {
    const expectedToken = this.configService.get('realtimeSocketToken', {
      infer: true,
    });
    const providedToken =
      this.readString(client.handshake.auth?.token) ??
      this.readString(client.handshake.headers['x-realtime-token']);

    if (!expectedToken || providedToken !== expectedToken) {
      client.emit('realtime.error', { message: 'Unauthorized realtime connection.' });
      client.disconnect(true);
      return;
    }

    const projectId =
      this.readString(client.handshake.auth?.projectId) ??
      this.readString(client.handshake.query.projectId);

    if (projectId) {
      client.join(this.projectRoom(projectId));
    }
  }

  @SubscribeMessage('projects.subscribe')
  public subscribeToProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { projectId?: string },
  ) {
    const projectId = body?.projectId?.trim();

    if (!projectId) {
      return { success: false as const, message: 'projectId is required.' };
    }

    client.join(this.projectRoom(projectId));
    return { success: true as const, projectId };
  }

  public broadcastProjectEvent(event: ProjectRealtimeEvent): void {
    this.server.to(this.projectRoom(event.projectId)).emit(event.name, event);
    this.server.emit('realtime.event', event);
  }

  private projectRoom(projectId: string): string {
    return `project:${projectId}`;
  }

  private readString(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }

    return undefined;
  }
}
