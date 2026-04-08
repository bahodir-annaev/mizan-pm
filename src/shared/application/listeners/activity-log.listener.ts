import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLoggerService } from '../services/activity-logger.service';

@Injectable()
export class ActivityLogListener {
  constructor(private readonly logger: ActivityLoggerService) {}

  // Time tracking events
  @OnEvent('time.started')
  async onTimeStarted(payload: { entry: any; user: any }) {
    await this.logger.log(
      payload.user.id,
      'time_started',
      'task',
      payload.entry.taskId,
      { timeEntryId: payload.entry.id },
    );
  }

  @OnEvent('time.stopped')
  async onTimeStopped(payload: { entry: any; duration?: number }) {
    await this.logger.log(
      payload.entry.userId,
      'time_stopped',
      'task',
      payload.entry.taskId,
      { timeEntryId: payload.entry.id, duration: payload.duration },
    );
  }

  // Project events
  @OnEvent('project.created')
  async onProjectCreated(payload: { project: any; actorId: string }) {
    await this.logger.log(
      payload.actorId,
      'created',
      'project',
      payload.project.id,
      { name: payload.project.name },
    );
  }

  @OnEvent('project.updated')
  async onProjectUpdated(payload: { project: any; actorId: string; changes: any }) {
    await this.logger.log(
      payload.actorId,
      'updated',
      'project',
      payload.project.id,
      { changes: payload.changes },
    );
  }

  @OnEvent('project.deleted')
  async onProjectDeleted(payload: { projectId: string; actorId: string }) {
    await this.logger.log(
      payload.actorId,
      'deleted',
      'project',
      payload.projectId,
    );
  }

  // Task events
  @OnEvent('task.created')
  async onTaskCreated(payload: { task: any; actorId: string }) {
    await this.logger.log(
      payload.actorId,
      'created',
      'task',
      payload.task.id,
      { title: payload.task.title, projectId: payload.task.projectId },
    );
  }

  @OnEvent('task.updated')
  async onTaskUpdated(payload: { task: any; actorId: string; changes: any }) {
    await this.logger.log(
      payload.actorId,
      'updated',
      'task',
      payload.task.id,
      { changes: payload.changes },
    );
  }

  @OnEvent('task.status_changed')
  async onTaskStatusChanged(payload: {
    task: any;
    actorId: string;
    oldStatus: string;
    newStatus: string;
  }) {
    await this.logger.log(
      payload.actorId,
      'status_changed',
      'task',
      payload.task.id,
      { oldStatus: payload.oldStatus, newStatus: payload.newStatus },
    );
  }

  @OnEvent('task.deleted')
  async onTaskDeleted(payload: { taskId: string; actorId: string }) {
    await this.logger.log(
      payload.actorId,
      'deleted',
      'task',
      payload.taskId,
    );
  }

  @OnEvent('task.assigned')
  async onTaskAssigned(payload: { taskId: string; userId: string; actorId: string }) {
    await this.logger.log(
      payload.actorId,
      'assigned',
      'task',
      payload.taskId,
      { assignedUserId: payload.userId },
    );
  }

  @OnEvent('task.unassigned')
  async onTaskUnassigned(payload: { taskId: string; userId: string; actorId: string }) {
    await this.logger.log(
      payload.actorId,
      'unassigned',
      'task',
      payload.taskId,
      { unassignedUserId: payload.userId },
    );
  }

  @OnEvent('task.moved')
  async onTaskMoved(payload: { task: any; actorId: string; oldParentId?: string }) {
    await this.logger.log(
      payload.actorId,
      'moved',
      'task',
      payload.task.id,
      { oldParentId: payload.oldParentId, newParentId: payload.task.parentId },
    );
  }

  // Team events
  @OnEvent('team.created')
  async onTeamCreated(payload: { team: any; actorId: string }) {
    await this.logger.log(
      payload.actorId,
      'created',
      'team',
      payload.team.id,
      { name: payload.team.name },
    );
  }

  @OnEvent('team.updated')
  async onTeamUpdated(payload: { team: any; actorId: string; changes: any }) {
    await this.logger.log(
      payload.actorId,
      'updated',
      'team',
      payload.team.id,
      { changes: payload.changes },
    );
  }

  @OnEvent('team.deleted')
  async onTeamDeleted(payload: { teamId: string; actorId: string }) {
    await this.logger.log(
      payload.actorId,
      'deleted',
      'team',
      payload.teamId,
    );
  }

  @OnEvent('team.member_added')
  async onTeamMemberAdded(payload: { teamId: string; userId: string; actorId: string }) {
    await this.logger.log(
      payload.actorId,
      'member_added',
      'team',
      payload.teamId,
      { addedUserId: payload.userId },
    );
  }

  @OnEvent('team.member_removed')
  async onTeamMemberRemoved(payload: { teamId: string; userId: string; actorId: string }) {
    await this.logger.log(
      payload.actorId,
      'member_removed',
      'team',
      payload.teamId,
      { removedUserId: payload.userId },
    );
  }
}
