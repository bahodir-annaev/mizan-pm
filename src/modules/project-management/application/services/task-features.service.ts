import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskParticipant } from '../../domain/entities/task-participant.entity';
import { TaskDependency } from '../../domain/entities/task-dependency.entity';
import { ChecklistItem } from '../../domain/entities/checklist-item.entity';
import { Comment } from '../../domain/entities/comment.entity';
import { Task } from '../../domain/entities/task.entity';
import { CreateChecklistItemDto } from '../dtos/create-checklist-item.dto';
import { UpdateChecklistItemDto } from '../dtos/update-checklist-item.dto';
import { CreateCommentDto } from '../dtos/create-comment.dto';
import { UpdateCommentDto } from '../dtos/update-comment.dto';
import {
  PaginatedResult,
  PaginationMeta,
  PaginationQueryDto,
} from '../../../../shared/application/pagination.dto';

@Injectable()
export class TaskFeaturesService {
  constructor(
    @InjectRepository(TaskParticipant)
    private readonly participantRepo: Repository<TaskParticipant>,
    @InjectRepository(TaskDependency)
    private readonly dependencyRepo: Repository<TaskDependency>,
    @InjectRepository(ChecklistItem)
    private readonly checklistRepo: Repository<ChecklistItem>,
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

  // ─── Helpers ──────────────────────────────────────────────

  private async findTaskOrFail(taskId: string): Promise<Task> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  // ─── Participants ─────────────────────────────────────────

  async getParticipants(taskId: string): Promise<TaskParticipant[]> {
    await this.findTaskOrFail(taskId);
    return this.participantRepo.find({
      where: { taskId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async addParticipant(
    taskId: string,
    userId: string,
  ): Promise<TaskParticipant> {
    await this.findTaskOrFail(taskId);

    const existing = await this.participantRepo.findOne({
      where: { taskId, userId },
    });
    if (existing) {
      throw new ConflictException('User is already a participant on this task');
    }

    const participant = this.participantRepo.create({ taskId, userId });
    const saved = await this.participantRepo.save(participant);
    return this.participantRepo.findOne({
      where: { id: saved.id },
      relations: ['user'],
    });
  }

  async removeParticipant(taskId: string, userId: string): Promise<void> {
    await this.findTaskOrFail(taskId);

    const participant = await this.participantRepo.findOne({
      where: { taskId, userId },
    });
    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    await this.participantRepo.remove(participant);
  }

  // ─── Dependencies ─────────────────────────────────────────

  async getDependencies(taskId: string): Promise<TaskDependency[]> {
    await this.findTaskOrFail(taskId);

    // Return dependencies where this task is the blocked one (what blocks this task)
    // AND where this task is the blocker (what this task blocks)
    const asBlocked = await this.dependencyRepo.find({
      where: { blockedId: taskId },
      relations: ['blocker', 'blocked'],
      order: { createdAt: 'ASC' },
    });

    const asBlocker = await this.dependencyRepo.find({
      where: { blockerId: taskId },
      relations: ['blocker', 'blocked'],
      order: { createdAt: 'ASC' },
    });

    return [...asBlocked, ...asBlocker];
  }

  async addDependency(
    taskId: string,
    blockerId: string,
  ): Promise<TaskDependency> {
    // taskId is the blocked task; blockerId is the task that blocks it
    const blockedTask = await this.findTaskOrFail(taskId);
    const blockerTask = await this.findTaskOrFail(blockerId);

    // Self-dependency check
    if (taskId === blockerId) {
      throw new BadRequestException('A task cannot depend on itself');
    }

    // Same project check
    if (blockedTask.projectId !== blockerTask.projectId) {
      throw new BadRequestException(
        'Blocker and blocked tasks must belong to the same project',
      );
    }

    // Duplicate check
    const existing = await this.dependencyRepo.findOne({
      where: { blockerId, blockedId: taskId },
    });
    if (existing) {
      throw new ConflictException('This dependency already exists');
    }

    // Circular dependency check
    await this.checkCircularDependency(blockerId, taskId);

    const dependency = this.dependencyRepo.create({
      blockerId,
      blockedId: taskId,
    });
    const saved = await this.dependencyRepo.save(dependency);
    return this.dependencyRepo.findOne({
      where: { id: saved.id },
      relations: ['blocker', 'blocked'],
    });
  }

  async removeDependency(depId: string): Promise<void> {
    const dependency = await this.dependencyRepo.findOne({
      where: { id: depId },
    });
    if (!dependency) {
      throw new NotFoundException('Dependency not found');
    }

    await this.dependencyRepo.remove(dependency);
  }

  /**
   * Checks for circular dependency by walking the chain.
   * If adding blockerId -> blockedId, we need to verify that
   * blockedId does not already (directly or transitively) block blockerId.
   */
  private async checkCircularDependency(
    blockerId: string,
    blockedId: string,
  ): Promise<void> {
    const visited = new Set<string>();
    const queue: string[] = [blockedId];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (currentId === blockerId) {
        throw new BadRequestException(
          'Adding this dependency would create a circular chain',
        );
      }

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      // Find all tasks that currentId blocks
      const deps = await this.dependencyRepo.find({
        where: { blockerId: currentId },
      });
      for (const dep of deps) {
        if (!visited.has(dep.blockedId)) {
          queue.push(dep.blockedId);
        }
      }
    }
  }

  // ─── Checklist ────────────────────────────────────────────

  async getChecklist(taskId: string): Promise<ChecklistItem[]> {
    await this.findTaskOrFail(taskId);
    return this.checklistRepo.find({
      where: { taskId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async addChecklistItem(
    taskId: string,
    dto: CreateChecklistItemDto,
  ): Promise<ChecklistItem> {
    await this.findTaskOrFail(taskId);

    // Auto-compute next sortOrder
    const maxItem = await this.checklistRepo
      .createQueryBuilder('ci')
      .select('MAX(ci.sort_order)', 'maxSort')
      .where('ci.task_id = :taskId', { taskId })
      .getRawOne();
    const nextSort = (maxItem?.maxSort ?? -1) + 1;

    const item = this.checklistRepo.create({
      taskId,
      title: dto.title,
      isCompleted: dto.isCompleted ?? false,
      sortOrder: nextSort,
    });

    return this.checklistRepo.save(item);
  }

  async updateChecklistItem(
    itemId: string,
    dto: UpdateChecklistItemDto,
  ): Promise<ChecklistItem> {
    const item = await this.checklistRepo.findOne({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException('Checklist item not found');
    }

    if (dto.title !== undefined) item.title = dto.title;
    if (dto.isCompleted !== undefined) item.isCompleted = dto.isCompleted;

    return this.checklistRepo.save(item);
  }

  async removeChecklistItem(itemId: string): Promise<void> {
    const item = await this.checklistRepo.findOne({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException('Checklist item not found');
    }

    await this.checklistRepo.remove(item);
  }

  async reorderChecklist(taskId: string, itemIds: string[]): Promise<ChecklistItem[]> {
    await this.findTaskOrFail(taskId);

    // Validate that all itemIds belong to this task
    const items = await this.checklistRepo.find({ where: { taskId } });
    const existingIds = new Set(items.map((i) => i.id));

    for (const id of itemIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(
          `Checklist item ${id} does not belong to this task`,
        );
      }
    }

    // Update sort orders according to the provided order
    for (let i = 0; i < itemIds.length; i++) {
      await this.checklistRepo.update(itemIds[i], { sortOrder: i });
    }

    return this.getChecklist(taskId);
  }

  // ─── Comments ─────────────────────────────────────────────

  async getComments(
    taskId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResult<Comment>> {
    await this.findTaskOrFail(taskId);

    const skip = (pagination.page - 1) * pagination.limit;

    const [comments, total] = await this.commentRepo.findAndCount({
      where: { taskId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip,
      take: pagination.limit,
    });

    return new PaginatedResult(
      comments,
      new PaginationMeta(pagination.page, pagination.limit, total),
    );
  }

  async addComment(
    taskId: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<Comment> {
    await this.findTaskOrFail(taskId);

    const comment = this.commentRepo.create({
      taskId,
      userId,
      content: dto.content,
    });

    const saved = await this.commentRepo.save(comment);
    return this.commentRepo.findOne({
      where: { id: saved.id },
      relations: ['user'],
    });
  }

  async updateComment(
    commentId: string,
    userId: string,
    dto: UpdateCommentDto,
  ): Promise<Comment> {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId },
      relations: ['user'],
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    comment.content = dto.content;
    return this.commentRepo.save(comment);
  }

  async removeComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentRepo.remove(comment);
  }
}
