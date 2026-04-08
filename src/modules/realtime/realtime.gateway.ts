import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';

@Injectable()
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      client.data.orgId = payload.orgId;

      // Auto-join user-specific and org-specific rooms
      client.join(`user:${payload.sub}`);
      if (payload.orgId) {
        client.join(`org:${payload.orgId}`);
      }

      this.logger.log(`Client connected: ${payload.sub}`);
    } catch (error) {
      this.logger.warn(`Auth failed for socket: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.logger.log(`Client disconnected: ${client.data.userId}`);
    }
  }

  @SubscribeMessage('join:project')
  handleJoinProject(client: Socket, projectId: string) {
    client.join(`project:${projectId}`);
  }

  @SubscribeMessage('leave:project')
  handleLeaveProject(client: Socket, projectId: string) {
    client.leave(`project:${projectId}`);
  }

  // --- Event listeners that broadcast via WebSocket ---

  @OnEvent('task.created')
  onTaskCreated(payload: any) {
    if (payload.task?.projectId) {
      this.server?.to(`project:${payload.task.projectId}`).emit('task:created', {
        task: payload.task,
        actorId: payload.actorId,
      });
    }
  }

  @OnEvent('task.updated')
  onTaskUpdated(payload: any) {
    if (payload.task?.projectId) {
      this.server?.to(`project:${payload.task.projectId}`).emit('task:updated', {
        task: payload.task,
        changes: payload.changes,
        actorId: payload.actorId,
      });
    }
  }

  @OnEvent('task.status_changed')
  onTaskStatusChanged(payload: any) {
    if (payload.task?.projectId) {
      this.server?.to(`project:${payload.task.projectId}`).emit('task:updated', {
        task: payload.task,
        oldStatus: payload.oldStatus,
        newStatus: payload.newStatus,
        actorId: payload.actorId,
      });
    }
  }

  @OnEvent('task.deleted')
  onTaskDeleted(payload: any) {
    if (payload.projectId) {
      this.server?.to(`project:${payload.projectId}`).emit('task:deleted', {
        taskId: payload.taskId,
        actorId: payload.actorId,
      });
    }
  }

  @OnEvent('project.updated')
  onProjectUpdated(payload: any) {
    if (payload.project?.id) {
      this.server?.to(`project:${payload.project.id}`).emit('project:updated', {
        project: payload.project,
        changes: payload.changes,
        actorId: payload.actorId,
      });
    }
    if (payload.project?.orgId) {
      this.server?.to(`org:${payload.project.orgId}`).emit('project:updated', {
        project: payload.project,
        actorId: payload.actorId,
      });
    }
  }

  @OnEvent('project.created')
  onProjectCreated(payload: any) {
    if (payload.project?.orgId) {
      this.server?.to(`org:${payload.project.orgId}`).emit('project:created', {
        project: payload.project,
        actorId: payload.actorId,
      });
    }
  }

  @OnEvent('time.started')
  onTimeLogged(payload: any) {
    if (payload.entry?.userId) {
      this.server?.to(`user:${payload.entry.userId}`).emit('time:logged', {
        entry: payload.entry,
      });
    }
  }

  @OnEvent('time.stopped')
  onTimeStopped(payload: any) {
    if (payload.entry?.userId) {
      this.server?.to(`user:${payload.entry.userId}`).emit('time:logged', {
        entry: payload.entry,
      });
    }
  }

  // Utility method for sending notifications to specific users
  sendToUser(userId: string, event: string, data: any) {
    this.server?.to(`user:${userId}`).emit(event, data);
  }

  // Utility method for broadcasting to an org
  sendToOrg(orgId: string, event: string, data: any) {
    this.server?.to(`org:${orgId}`).emit(event, data);
  }
}
