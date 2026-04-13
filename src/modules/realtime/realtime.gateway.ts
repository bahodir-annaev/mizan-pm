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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../identity/domain/entities/user.entity';

@Injectable()
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  /** userId → set of socketIds (handles multiple tabs/devices) */
  private readonly onlineUsers = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

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

      // Track online presence
      const userId: string = payload.sub;
      if (!this.onlineUsers.has(userId)) {
        this.onlineUsers.set(userId, new Set());
      }
      this.onlineUsers.get(userId)!.add(client.id);

      // Update lastActiveAt in DB (fire-and-forget)
      this.userRepo.update(userId, { lastActiveAt: new Date() }).catch(() => undefined);

      // Broadcast to org that this user came online
      if (payload.orgId) {
        this.server?.to(`org:${payload.orgId}`).emit('user:online', { userId });
      }

      this.logger.log(`Client connected: ${userId}`);
    } catch (error) {
      this.logger.warn(`Auth failed for socket: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId: string | undefined = client.data.userId;
    const orgId: string | undefined = client.data.orgId;

    if (userId) {
      const sockets = this.onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.onlineUsers.delete(userId);
          // Last connection closed — user is now offline
          if (orgId) {
            this.server?.to(`org:${orgId}`).emit('user:offline', { userId });
          }
        }
      }
      this.logger.log(`Client disconnected: ${userId}`);
    }
  }

  /** Returns the set of user IDs currently online. */
  getOnlineUserIds(): string[] {
    return Array.from(this.onlineUsers.keys());
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
