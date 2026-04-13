import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationService } from '../services/notification.service';
import { RealtimeGateway } from '../../../realtime/realtime.gateway';
import { Task } from '../../../project-management/domain/entities/task.entity';
import { TaskAssignee } from '../../../project-management/domain/entities/task-assignee.entity';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly realtimeGateway: RealtimeGateway,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskAssignee)
    private readonly taskAssigneeRepo: Repository<TaskAssignee>,
  ) {}

  @OnEvent('task.assigned')
  async onTaskAssigned(payload: { taskId: string; userId: string; actorId: string }) {
    try {
      const task = await this.taskRepo.findOne({ where: { id: payload.taskId } });
      if (!task) return;

      const notification = await this.notificationService.create(
        payload.userId,
        'task.assigned',
        'You have been assigned to a task',
        `You were assigned to task "${task.title}"`,
        'task',
        payload.taskId,
      );

      this.realtimeGateway.sendToUser(payload.userId, 'notification:new', notification);
    } catch (err) {
      this.logger.error(`Failed to create task.assigned notification: ${err.message}`);
    }
  }

  @OnEvent('time.started')
  async onTimeStarted(payload: { entry: { taskId: string; userId: string }; user: { id: string } }) {
    try {
      const { entry, user } = payload;
      const task = await this.taskRepo.findOne({ where: { id: entry.taskId } });
      if (!task) return;

      const assignees = await this.taskAssigneeRepo.find({
        where: { taskId: entry.taskId },
      });

      // Notify all assignees except the one who started the timer
      const others = assignees.filter((a) => a.userId !== user.id);

      await Promise.all(
        others.map(async (assignee) => {
          try {
            const notification = await this.notificationService.create(
              assignee.userId,
              'time.started',
              'Time tracking started on a task',
              `Time tracking started on task "${task.title}"`,
              'task',
              entry.taskId,
            );
            this.realtimeGateway.sendToUser(assignee.userId, 'notification:new', notification);
          } catch (err) {
            this.logger.error(
              `Failed to notify user ${assignee.userId} about time.started: ${err.message}`,
            );
          }
        }),
      );
    } catch (err) {
      this.logger.error(`Failed to handle time.started notifications: ${err.message}`);
    }
  }
}
