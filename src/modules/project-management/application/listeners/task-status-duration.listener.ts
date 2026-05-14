import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskStatusLog } from '../../domain/entities/task-status-log.entity';
import { TaskStatus } from '../../domain/entities/task-status.enum';

@Injectable()
export class TaskStatusDurationListener {
  private readonly logger = new Logger(TaskStatusDurationListener.name);

  constructor(
    @InjectRepository(TaskStatusLog)
    private readonly logRepo: Repository<TaskStatusLog>,
  ) {}

  @OnEvent('task.status_changed')
  async onStatusChanged(payload: {
    task: { id: string };
    oldStatus: TaskStatus;
    newStatus: TaskStatus;
  }): Promise<void> {
    const { task, oldStatus, newStatus } = payload;

    try {
      if (newStatus === TaskStatus.IN_PROGRESS) {
        const log = this.logRepo.create({
          taskId: task.id,
          status: TaskStatus.IN_PROGRESS,
          startedAt: new Date(),
          endedAt: null,
          durationSeconds: null,
        });
        await this.logRepo.save(log);
      } else if (oldStatus === TaskStatus.IN_PROGRESS) {
        await this.closeOpenSession(task.id, new Date());
      }
    } catch (err) {
      this.logger.error(
        `Failed to record status duration for task ${task.id}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  @OnEvent('task.deleted')
  async onTaskDeleted(payload: { taskId: string }): Promise<void> {
    try {
      await this.closeOpenSession(payload.taskId, new Date());
    } catch (err) {
      this.logger.error(
        `Failed to close open status session for deleted task ${payload.taskId}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  private async closeOpenSession(taskId: string, now: Date): Promise<void> {
    const open = await this.logRepo.findOne({
      where: { taskId, status: TaskStatus.IN_PROGRESS, endedAt: null },
      order: { startedAt: 'DESC' },
    });

    if (!open) return;

    open.endedAt = now;
    open.durationSeconds = Math.floor(
      (now.getTime() - open.startedAt.getTime()) / 1000,
    );
    await this.logRepo.save(open);
  }
}
