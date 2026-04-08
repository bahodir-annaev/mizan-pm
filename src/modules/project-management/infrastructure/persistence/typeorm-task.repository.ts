import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Task } from '../../domain/entities/task.entity';
import { TaskAssignee } from '../../domain/entities/task-assignee.entity';
import { TaskStatus } from '../../domain/entities/task-status.enum';
import {
  ITaskRepository,
  TaskFilterParams,
} from '../../domain/repositories/task-repository.interface';

@Injectable()
export class TypeOrmTaskRepository implements ITaskRepository {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskAssignee)
    private readonly assigneeRepo: Repository<TaskAssignee>,
  ) {}

  // --- Core CRUD ---

  async findById(id: string, relations?: string[]): Promise<Task | null> {
    return this.taskRepo.findOne({
      where: { id },
      relations: relations ?? ['creator', 'project', 'assignee', 'participants', 'participants.user'],
    });
  }

  async save(task: Task): Promise<Task> {
    return this.taskRepo.save(task);
  }

  async saveMany(tasks: Task[]): Promise<Task[]> {
    return this.taskRepo.save(tasks);
  }

  async softDelete(id: string): Promise<void> {
    await this.taskRepo.softDelete(id);
  }

  async softDeleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.taskRepo.softDelete(ids);
  }

  // --- Hierarchy queries ---

  async findChildren(parentId: string): Promise<Task[]> {
    return this.taskRepo.find({
      where: { parentId },
      relations: ['creator', 'assignee', 'participants', 'participants.user'],
      order: { position: 'ASC' },
    });
  }

  async findSubtree(materializedPathPrefix: string): Promise<Task[]> {
    return this.taskRepo
      .createQueryBuilder('task')
      .where('task.materialized_path LIKE :prefix', {
        prefix: `${materializedPathPrefix}%`,
      })
      .leftJoinAndSelect('task.creator', 'creator')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'participantUser')
      .orderBy('task.depth', 'ASC')
      .addOrderBy('task.position', 'ASC')
      .getMany();
  }

  async findTopLevelByProject(
    projectId: string,
    filters: TaskFilterParams,
    skip: number,
    take: number,
  ): Promise<[Task[], number]> {
    const qb = this.taskRepo
      .createQueryBuilder('task')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.parent_id IS NULL');

    this.applyFilters(qb, filters);

    qb.leftJoinAndSelect('task.creator', 'creator')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'participantUser')
      .skip(skip)
      .take(take);

    this.applySorting(qb, filters);

    return qb.getManyAndCount();
  }

  async findByProject(
    projectId: string,
    filters: TaskFilterParams,
    skip: number,
    take: number,
  ): Promise<[Task[], number]> {
    const qb = this.taskRepo
      .createQueryBuilder('task')
      .where('task.project_id = :projectId', { projectId });

    this.applyFilters(qb, filters);

    qb.leftJoinAndSelect('task.creator', 'creator')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'participantUser')
      .skip(skip)
      .take(take);

    this.applySorting(qb, filters);

    return qb.getManyAndCount();
  }

  // --- Cross-project user task list ---

  async findForUser(
    userId: string,
    filters: TaskFilterParams,
    skip: number,
    take: number,
  ): Promise<[Task[], number]> {
    const qb = this.taskRepo
      .createQueryBuilder('task')
      .where(
        '(task.created_by = :userId' +
          ' OR task.id IN (SELECT ta.task_id FROM task_assignees ta WHERE ta.user_id = :userId)' +
          ' OR task.id IN (SELECT tp.task_id FROM task_participants tp WHERE tp.user_id = :userId))',
        { userId },
      );

    if (filters.projectId) {
      qb.andWhere('task.project_id = :projectId', { projectId: filters.projectId });
    }

    this.applyFilters(qb, filters);

    qb.leftJoinAndSelect('task.creator', 'creator')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'participantUser')
      .skip(skip)
      .take(take);

    this.applySorting(qb, filters);

    return qb.getManyAndCount();
  }

  // --- Position ---

  async getMaxPositionAmongSiblings(
    projectId: string,
    parentId: string | null,
  ): Promise<number> {
    const qb = this.taskRepo
      .createQueryBuilder('task')
      .select('MAX(task.position)', 'maxPos')
      .where('task.project_id = :projectId', { projectId });

    if (parentId) {
      qb.andWhere('task.parent_id = :parentId', { parentId });
    } else {
      qb.andWhere('task.parent_id IS NULL');
    }

    const result = await qb.getRawOne();
    return result?.maxPos ?? -1;
  }

  // --- Subtree path update ---

  async updateSubtreePaths(
    oldPathPrefix: string,
    newPathPrefix: string,
    depthDelta: number,
  ): Promise<void> {
    await this.taskRepo
      .createQueryBuilder()
      .update(Task)
      .set({
        materializedPath: () =>
          `CONCAT(:newPrefix, SUBSTRING(materialized_path, :oldLen))`,
        depth: () => `depth + :depthDelta`,
      })
      .where('materialized_path LIKE :pattern', {
        pattern: `${oldPathPrefix}%`,
      })
      .setParameters({
        newPrefix: newPathPrefix,
        oldLen: oldPathPrefix.length + 1,
        depthDelta,
      })
      .execute();
  }

  // --- Assignee operations ---

  async findAssignee(
    taskId: string,
    userId: string,
  ): Promise<TaskAssignee | null> {
    return this.assigneeRepo.findOne({
      where: { taskId, userId },
      relations: ['user'],
    });
  }

  async findAssigneesByTask(taskId: string): Promise<TaskAssignee[]> {
    return this.assigneeRepo.find({
      where: { taskId },
      relations: ['user'],
      order: { assignedAt: 'ASC' },
    });
  }

  async saveAssignee(assignee: TaskAssignee): Promise<TaskAssignee> {
    return this.assigneeRepo.save(assignee);
  }

  async removeAssignee(assignee: TaskAssignee): Promise<void> {
    await this.assigneeRepo.remove(assignee);
  }

  // --- Cascading helpers ---

  async findNonCompletedChildren(parentId: string): Promise<Task[]> {
    return this.taskRepo
      .createQueryBuilder('task')
      .where('task.parent_id = :parentId', { parentId })
      .andWhere('task.status NOT IN (:...statuses)', {
        statuses: [TaskStatus.DONE, TaskStatus.CANCELLED],
      })
      .getMany();
  }

  async findAllChildrenIds(parentId: string): Promise<string[]> {
    const parent = await this.taskRepo.findOne({ where: { id: parentId } });
    if (!parent) return [];

    const pathPrefix = parent.materializedPath
      ? `${parent.materializedPath}.${parent.id}`
      : parent.id;

    const descendants = await this.taskRepo
      .createQueryBuilder('task')
      .select('task.id')
      .where('task.materialized_path LIKE :prefix', {
        prefix: `${pathPrefix}%`,
      })
      .getMany();

    return descendants.map((t) => t.id);
  }

  async areAllChildrenDone(parentId: string): Promise<boolean> {
    const count = await this.taskRepo.count({
      where: { parentId },
    });
    if (count === 0) return false;

    const doneCount = await this.taskRepo.count({
      where: { parentId, status: TaskStatus.DONE },
    });

    return count === doneCount;
  }

  // --- Private helpers ---

  private applyFilters(
    qb: SelectQueryBuilder<Task>,
    filters: TaskFilterParams,
  ): void {
    if (filters.status) {
      qb.andWhere('task.status = :status', { status: filters.status });
    }
    if (filters.priority) {
      qb.andWhere('task.priority = :priority', { priority: filters.priority });
    }
    if (filters.assigneeId) {
      qb.innerJoin(
        'task.participants',
        'filterParticipant',
        'filterParticipant.userId = :assigneeId',
        { assigneeId: filters.assigneeId },
      );
    }
    if (filters.search) {
      qb.andWhere('task.title ILIKE :search', {
        search: `%${filters.search}%`,
      });
    }
    if (filters.maxDepth !== undefined) {
      qb.andWhere('task.depth <= :maxDepth', { maxDepth: filters.maxDepth });
    }
  }

  private applySorting(
    qb: SelectQueryBuilder<Task>,
    filters: TaskFilterParams,
  ): void {
    const sortBy = filters.sortBy || 'position';
    const sortOrder = filters.sortOrder || 'ASC';

    const allowedSorts = [
      'position',
      'createdAt',
      'dueDate',
      'priority',
      'status',
      'title',
    ];
    const column = allowedSorts.includes(sortBy) ? sortBy : 'position';

    qb.orderBy(`task.${column}`, sortOrder);
  }
}
